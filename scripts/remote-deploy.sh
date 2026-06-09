#!/bin/bash
# Unified production deploy — GitHub Actions (transfer mode) and manual fallback (build mode).
#
# Transfer mode (default for CI — VPS cannot reach ghcr.io):
#   DEPLOY_MODE=transfer IMAGES_TARBALL=/tmp/agahiram-images.tar.gz \
#     CONFIG_TARBALL=/tmp/agahiram-config.tar.gz BUILD_SERVICES="api web" \
#     bash scripts/remote-deploy.sh
#
# Pull mode (registry reachable from VPS only):
#   DEPLOY_MODE=pull IMAGE_TAG=abc123 CONFIG_TARBALL=/tmp/agahiram-config.tar.gz \
#     BUILD_SERVICES="api web" bash scripts/remote-deploy.sh
#
# Build mode (emergency / no registry):
#   DEPLOY_MODE=build SRC_TARBALL=/tmp/agahiram-src.tar.gz bash scripts/remote-deploy.sh
#
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/agahiram}"
ENV_FILE="$APP_DIR/docker/.env"
BUILD_SERVICES="${BUILD_SERVICES:-}"
CONFIG_ONLY="${CONFIG_ONLY:-}"
DEPLOY_MODE="${DEPLOY_MODE:-transfer}"

# Only default to all services in on-server build mode — never when pulling (empty = skip pull).
if [[ "$DEPLOY_MODE" == "build" && -z "${BUILD_SERVICES// /}" ]]; then
  BUILD_SERVICES="api worker web admin"
fi
DOMAIN="${DOMAIN:-alooche.com}"
IMAGE_REGISTRY="${IMAGE_REGISTRY:-ghcr.io/labpar000/agahiram}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
LOCK_FILE="${LOCK_FILE:-/var/lock/agahiram-deploy.lock}"
LOCK_PID_FILE="${LOCK_PID_FILE:-/var/lock/agahiram-deploy.pid}"
STATUS_FILE="${STATUS_FILE:-/tmp/agahiram-deploy.status}"
LOG_FILE="${LOG_FILE:-/tmp/agahiram-deploy.log}"
STALE_LOCK_MAX_AGE_SEC="${STALE_LOCK_MAX_AGE_SEC:-1800}"

COMPOSE="-f docker-compose.prod.yml"
COMPOSE_BUILD="-f docker-compose.prod.yml -f docker-compose.build.yml"

log() { echo "[deploy] $*" | tee -a "$LOG_FILE"; }

write_status() {
  echo "$1" > "$STATUS_FILE"
}

read_env_var() {
  local key="$1"
  grep -m1 "^${key}=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true
}

url_encode() {
  python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$1"
}

database_url_from_env() {
  [[ -f "$ENV_FILE" ]] || {
    log "missing $ENV_FILE — cannot build DATABASE_URL"
    return 1
  }
  local user pass db enc_pass
  user="$(read_env_var POSTGRES_USER)"
  pass="$(read_env_var POSTGRES_PASSWORD)"
  db="$(read_env_var POSTGRES_DB)"
  if [[ -z "$user" || -z "$pass" || -z "$db" ]]; then
    log "POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB missing in $ENV_FILE"
    return 1
  fi
  enc_pass="$(url_encode "$pass")"
  printf 'postgresql://%s:%s@postgres:5432/%s?schema=public' "$user" "$enc_pass" "$db"
}

sync_database_url_env() {
  [[ -f "$ENV_FILE" ]] || return 0
  local db_url
  db_url="$(database_url_from_env)" || return 0
  if grep -q '^DATABASE_URL=' "$ENV_FILE" 2>/dev/null; then
    grep -v '^DATABASE_URL=' "$ENV_FILE" > "${ENV_FILE}.tmp"
    printf 'DATABASE_URL=%s\n' "$db_url" >> "${ENV_FILE}.tmp"
    mv "${ENV_FILE}.tmp" "$ENV_FILE"
  else
    printf 'DATABASE_URL=%s\n' "$db_url" >> "$ENV_FILE"
  fi
  log "synced DATABASE_URL from POSTGRES_* credentials"
}

align_postgres_password_with_env() {
  [[ -f "$ENV_FILE" ]] || return 0
  local user pass pass_sql
  user="$(read_env_var POSTGRES_USER)"
  pass="$(read_env_var POSTGRES_PASSWORD)"
  [[ -n "$user" && -n "$pass" ]] || return 0
  if ! docker ps --format '{{.Names}}' | grep -qx 'agahiram-postgres'; then
    log "postgres container not running — skipping password alignment"
    return 0
  fi
  pass_sql="${pass//\'/\'\'}"
  if docker exec agahiram-postgres psql -U "$user" -d postgres -c \
    "ALTER USER \"${user}\" PASSWORD '${pass_sql}';" >/dev/null 2>&1; then
    log "aligned postgres role password with POSTGRES_PASSWORD in .env"
  else
    log "could not align postgres password (continuing with migrate)"
  fi
}

run_db_migrate_and_seed() {
  align_postgres_password_with_env
  sync_database_url_env
  local db_url
  db_url="$(database_url_from_env)"
  log "running database migrations..."
  docker compose $COMPOSE run --rm --workdir /app \
    -e "DATABASE_URL=${db_url}" \
    api sh -lc \
    '/app/node_modules/.bin/prisma migrate deploy --schema /app/packages/database/prisma/schema.prisma'
  log "running database seed (idempotent)..."
  docker compose $COMPOSE run --rm --workdir /app \
    -e "DATABASE_URL=${db_url}" \
    api sh -lc \
    'cd /app/packages/database && node --experimental-strip-types prisma/seed.ts'
}

acquire_deploy_lock() {
  mkdir -p "$(dirname "$LOCK_FILE")"
  exec 9>"$LOCK_FILE"
  if flock -n 9; then
    echo $$ > "$LOCK_PID_FILE"
    return 0
  fi

  local stale=false holder age mtime now status
  if [[ -f "$LOCK_PID_FILE" ]]; then
    holder="$(cat "$LOCK_PID_FILE" 2>/dev/null || true)"
    if [[ -n "$holder" && ! -d "/proc/$holder" ]]; then
      log "deploy lock holder pid $holder is not running"
      stale=true
    fi
  fi

  if [[ "$stale" != "true" && -f "$STATUS_FILE" ]]; then
    status="$(cat "$STATUS_FILE" 2>/dev/null || true)"
    mtime="$(stat -c %Y "$STATUS_FILE" 2>/dev/null || echo 0)"
    now="$(date +%s)"
    age=$((now - mtime))
    if [[ "$status" == "running" && "$age" -gt "$STALE_LOCK_MAX_AGE_SEC" ]]; then
      log "deploy status running for ${age}s (>${STALE_LOCK_MAX_AGE_SEC}s) — treating lock as stale"
      stale=true
    fi
  fi

  if [[ "$stale" == "true" ]]; then
    log "clearing stale deploy lock"
    rm -f "$LOCK_PID_FILE" "$LOCK_FILE"
    exec 9>"$LOCK_FILE"
    if flock -n 9; then
      echo $$ > "$LOCK_PID_FILE"
      return 0
    fi
  fi

  log "another deploy is in progress — exiting"
  write_status "failed:locked"
  exit 1
}

migrate_minio_env() {
  [[ -f "$ENV_FILE" ]] || return 0
  add_if_missing() {
    local key="$1"
    local val="$2"
    grep -q "^${key}=" "$ENV_FILE" || echo "${key}=${val}" >> "$ENV_FILE"
  }
  add_if_missing MINIO_ENDPOINT minio
  add_if_missing MINIO_PORT 9000
  add_if_missing MINIO_USE_SSL false
  add_if_missing MINIO_PUBLIC_HOST "$DOMAIN"
  add_if_missing MINIO_PUBLIC_PORT 443
  add_if_missing MINIO_PUBLIC_USE_SSL true
  add_if_missing MINIO_PUBLIC_PATH_PREFIX /storage
  add_if_missing MINIO_CORS_ORIGIN "https://${DOMAIN}"
  add_if_missing IMAGE_REGISTRY "$IMAGE_REGISTRY"
  if grep -q '^S3_BUCKET=' "$ENV_FILE" && ! grep -q '^MINIO_BUCKET=' "$ENV_FILE"; then
    echo "MINIO_BUCKET=$(grep '^S3_BUCKET=' "$ENV_FILE" | cut -d= -f2-)" >> "$ENV_FILE"
  fi
  if grep -q '^S3_ACCESS_KEY=' "$ENV_FILE" && ! grep -q '^MINIO_ACCESS_KEY=' "$ENV_FILE"; then
    echo "MINIO_ACCESS_KEY=$(grep '^S3_ACCESS_KEY=' "$ENV_FILE" | cut -d= -f2-)" >> "$ENV_FILE"
  fi
  if grep -q '^S3_SECRET_KEY=' "$ENV_FILE" && ! grep -q '^MINIO_SECRET_KEY=' "$ENV_FILE"; then
    echo "MINIO_SECRET_KEY=$(grep '^S3_SECRET_KEY=' "$ENV_FILE" | cut -d= -f2-)" >> "$ENV_FILE"
  fi
}

migrate_admin_phones_env() {
  [[ -f "$ENV_FILE" ]] || return 0
  local phone="09132609737"
  if grep -q '^ADMIN_PHONES=' "$ENV_FILE" 2>/dev/null; then
    if ! grep '^ADMIN_PHONES=' "$ENV_FILE" | grep -q "$phone"; then
      sed -i "s|^ADMIN_PHONES=\(.*\)|ADMIN_PHONES=\1,${phone}|" "$ENV_FILE"
      log "appended ${phone} to ADMIN_PHONES"
    fi
  else
    echo "ADMIN_PHONES=09120000000,09127477990,${phone}" >> "$ENV_FILE"
    log "seeded ADMIN_PHONES with ${phone}"
  fi
}

migrate_voice_video_env() {
  local script="$APP_DIR/scripts/configure-voice-video.sh"
  if [[ -f "$script" ]]; then
    chmod +x "$script" 2>/dev/null || true
    bash "$script" "$ENV_FILE"
  fi
}

migrate_sms_env() {
  [[ -f "$ENV_FILE" ]] || return 0
  # Only update a key if its current value is empty/missing
  _sms_add_if_empty() {
    local key="$1"
    local val="$2"
    [[ -z "$val" ]] && return 0
    if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
      local current
      current=$(grep "^${key}=" "$ENV_FILE" | head -1 | cut -d= -f2-)
      if [[ -z "$current" ]]; then
        sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
        log "sms: set $key"
      fi
    else
      echo "${key}=${val}" >> "$ENV_FILE"
      log "sms: added $key"
    fi
  }
  _sms_add_if_empty "SMS_PROVIDER"      "smsir"
  _sms_add_if_empty "SMS_IR_API_KEY"    "95rdSxrnOS2hHkbbkdSt6jlIjnMaHyYuY2p5E6qNqHwAQa5E"
  _sms_add_if_empty "SMS_IR_TEMPLATE_ID" "307289"
  _sms_add_if_empty "SMS_IR_PARAM_NAME"  "Code"
  # Disable Kavenegar so smsir is the sole active provider
  if grep -q "^KAVENEGAR_DEV_MODE=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^KAVENEGAR_DEV_MODE=.*|KAVENEGAR_DEV_MODE=true|" "$ENV_FILE"
  else
    echo "KAVENEGAR_DEV_MODE=true" >> "$ENV_FILE"
  fi
}

# Keep docker/.env in sync so manual `compose up` does not resurrect an old IMAGE_TAG.
sync_image_tag_env() {
  [[ -f "$ENV_FILE" ]] || return 0
  [[ -n "${IMAGE_TAG:-}" ]] || return 0
  if grep -q '^IMAGE_TAG=' "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^IMAGE_TAG=.*|IMAGE_TAG=${IMAGE_TAG}|" "$ENV_FILE"
  else
    echo "IMAGE_TAG=${IMAGE_TAG}" >> "$ENV_FILE"
  fi
  if grep -q '^IMAGE_REGISTRY=' "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^IMAGE_REGISTRY=.*|IMAGE_REGISTRY=${IMAGE_REGISTRY}|" "$ENV_FILE"
  else
    echo "IMAGE_REGISTRY=${IMAGE_REGISTRY}" >> "$ENV_FILE"
  fi
}

verify_checksum() {
  local file="$1"
  local expected="${2:-}"
  [[ -n "$expected" ]] || return 0
  local actual
  actual="$(sha256sum "$file" | awk '{print $1}')"
  if [[ "$actual" != "$expected" ]]; then
    log "checksum mismatch for $file (expected $expected, got $actual)"
    return 1
  fi
  log "checksum ok: $file"
}

extract_config() {
  local tarball="$1"
  local checksum="${2:-}"
  verify_checksum "$tarball" "$checksum"
  log "extracting config $tarball -> $APP_DIR"
  mkdir -p "$APP_DIR"
  tar -xzf "$tarball" -C "$APP_DIR"
}

extract_source() {
  local tarball="$1"
  local checksum="${2:-}"
  verify_checksum "$tarball" "$checksum"
  log "extracting source $tarball -> $APP_DIR"
  mkdir -p "$APP_DIR"
  tar -xzf "$tarball" -C "$APP_DIR"
}

# Optional: set GHCR_DNS_IP on VPS when a local mirror is available (e.g. 87.107.110.109).
ensure_ghcr_hosts() {
  [[ -n "${GHCR_DNS_IP:-}" ]] || return 0
  local ip="$GHCR_DNS_IP"
  if getent hosts ghcr.io | awk '{print $1}' | grep -qxF "$ip"; then
    log "ghcr.io DNS OK ($ip)"
    return 0
  fi
  log "pinning ghcr.io -> $ip in /etc/hosts"
  if grep -q '[[:space:]]ghcr\.io$' /etc/hosts 2>/dev/null; then
    sed -i '/[[:space:]]ghcr\.io$/d' /etc/hosts
  fi
  echo "$ip ghcr.io" >> /etc/hosts
}

ghcr_login() {
  if [[ -z "${GHCR_TOKEN:-}" ]]; then
    return 0
  fi
  local attempt
  for attempt in 1 2 3 4 5; do
    log "logging in to ghcr.io (attempt $attempt/5)..."
    if echo "$GHCR_TOKEN" | docker login ghcr.io -u "${GHCR_USER:-Labpar000}" --password-stdin; then
      return 0
    fi
    sleep 5
  done
  log "ghcr.io login failed after 5 attempts"
  return 1
}

deploy_transfer() {
  if [[ -n "${CONFIG_TARBALL:-}" ]]; then
    extract_config "$CONFIG_TARBALL" "${CONFIG_SHA256:-}"
  elif [[ -n "${SRC_TARBALL:-}" ]]; then
    extract_source "$SRC_TARBALL" "${SRC_SHA256:-}"
  fi

  migrate_minio_env
  migrate_admin_phones_env
  migrate_voice_video_env
  migrate_sms_env
  sync_image_tag_env

  if [[ -n "${IMAGE_SERVICES:-}" ]]; then
    read -r -a image_services <<< "$IMAGE_SERVICES"
    log "loading ${#image_services[@]} image(s) in parallel"
    pids=()
    for svc in "${image_services[@]}"; do
      tarball="/tmp/image-${svc}.tar.gz"
      if [[ ! -f "$tarball" ]]; then
        log "missing image tarball: $tarball"
        exit 1
      fi
      ( gunzip -c "$tarball" | docker load ) &
      pids+=($!)
    done
    for pid in "${pids[@]}"; do wait "$pid"; done
  elif [[ -n "${IMAGES_TARBALL:-}" ]]; then
    verify_checksum "$IMAGES_TARBALL" "${IMAGES_SHA256:-}"
    log "loading images from $IMAGES_TARBALL"
    gunzip -c "$IMAGES_TARBALL" | docker load
  fi

  cd "$APP_DIR/docker"
  export IMAGE_REGISTRY IMAGE_TAG

  log "ensuring infra containers..."
  docker compose $COMPOSE up -d postgres redis meilisearch minio livekit
  docker compose $COMPOSE up -d createbuckets

  if [[ -z "${BUILD_SERVICES// /}" && -z "${IMAGE_SERVICES:-}" && -z "${IMAGES_TARBALL:-}" ]]; then
    if [[ -n "$CONFIG_ONLY" ]]; then
      log "config-only deploy: recreating $CONFIG_ONLY"
      docker compose $COMPOSE up -d --force-recreate "$CONFIG_ONLY"
    else
      log "config sync only (no image changes)"
    fi
    docker compose $COMPOSE ps
    return 0
  fi

  if [[ " $BUILD_SERVICES " == *" api "* || " $BUILD_SERVICES " == *" worker "* ]]; then
    run_db_migrate_and_seed
  fi

  log "restarting application containers..."
  recreate=( )
  if [[ -n "${BUILD_SERVICES// /}" ]]; then
    read -r -a recreate <<< "$BUILD_SERVICES"
  fi
  recreate+=("caddy" "livekit")
  if [[ -n "$CONFIG_ONLY" && " ${recreate[*]} " != *" $CONFIG_ONLY "* ]]; then
    recreate+=("$CONFIG_ONLY")
  fi
  # shellcheck disable=SC2086
  docker compose $COMPOSE up -d --pull never --no-deps --force-recreate "${recreate[@]}"
  docker image prune -f
  docker compose $COMPOSE ps
}

deploy_pull() {
  if [[ -n "${CONFIG_TARBALL:-}" ]]; then
    extract_config "$CONFIG_TARBALL" "${CONFIG_SHA256:-}"
  elif [[ -n "${SRC_TARBALL:-}" ]]; then
    extract_source "$SRC_TARBALL" "${SRC_SHA256:-}"
  fi

  migrate_minio_env
  migrate_admin_phones_env
  migrate_voice_video_env
  migrate_sms_env
  sync_image_tag_env
  ensure_ghcr_hosts
  ghcr_login

  cd "$APP_DIR/docker"
  export IMAGE_REGISTRY IMAGE_TAG

  log "ensuring infra containers..."
  docker compose $COMPOSE up -d postgres redis meilisearch minio livekit
  docker compose $COMPOSE up -d createbuckets

  if [[ -n "$CONFIG_ONLY" && -z "${BUILD_SERVICES// /}" ]]; then
    log "config-only deploy: recreating $CONFIG_ONLY"
    docker compose $COMPOSE up -d --force-recreate "$CONFIG_ONLY"
    docker compose $COMPOSE ps
    return 0
  fi

  if [[ -n "${BUILD_SERVICES// /}" ]]; then
    pull_services() {
      local tag="$1"
      export IMAGE_TAG="$tag"
      log "pulling images sequentially (tag=$tag): $BUILD_SERVICES"
      local svc attempt
      for svc in $BUILD_SERVICES; do
        for attempt in 1 2 3 4 5 6 7 8; do
          log "pull $svc (tag=$tag) attempt $attempt/8"
          if docker compose $COMPOSE pull "$svc"; then
            break
          fi
          if [[ "$attempt" -eq 8 ]]; then
            return 1
          fi
          sleep 10
        done
      done
      return 0
    }
    if ! pull_services "$IMAGE_TAG"; then
      log "pull failed for tag=$IMAGE_TAG — aborting (refusing stale latest fallback)"
      exit 1
    fi
    sync_image_tag_env
  fi

  if [[ " $BUILD_SERVICES " == *" api "* || " $BUILD_SERVICES " == *" worker "* ]]; then
    run_db_migrate_and_seed
  fi

  log "restarting application containers..."
  recreate=( )
  if [[ -n "${BUILD_SERVICES// /}" ]]; then
    read -r -a recreate <<< "$BUILD_SERVICES"
  fi
  recreate+=("caddy" "livekit")
  if [[ -n "$CONFIG_ONLY" && " ${recreate[*]} " != *" $CONFIG_ONLY "* ]]; then
    recreate+=("$CONFIG_ONLY")
  fi
  # Only recreate requested services — do not pull api/admin/worker when only web changed.
  # shellcheck disable=SC2086
  docker compose $COMPOSE up -d --pull never --no-deps --force-recreate "${recreate[@]}"
  docker image prune -f
  docker compose $COMPOSE ps
}

deploy_build() {
  if [[ -n "${SRC_TARBALL:-}" ]]; then
    extract_source "$SRC_TARBALL" "${SRC_SHA256:-}"
  fi

  migrate_minio_env
  migrate_admin_phones_env
  migrate_voice_video_env
  migrate_sms_env
  sync_image_tag_env

  cd "$APP_DIR/docker"
  export DOCKER_BUILDKIT=1
  export COMPOSE_DOCKER_CLI_BUILD=1

  log "ensuring infra containers..."
  docker compose $COMPOSE up -d postgres redis meilisearch minio livekit
  docker compose $COMPOSE up -d createbuckets

  log "building (parallel, fallback mode): $BUILD_SERVICES"
  # shellcheck disable=SC2086
  docker compose $COMPOSE_BUILD build --parallel $BUILD_SERVICES

  if [[ " $BUILD_SERVICES " == *" api "* || " $BUILD_SERVICES " == *" worker "* ]]; then
    run_db_migrate_and_seed
  fi

  log "restarting application containers..."
  # shellcheck disable=SC2086
  docker compose $COMPOSE up -d --force-recreate $BUILD_SERVICES caddy livekit
  docker image prune -f
  docker compose $COMPOSE ps
}

main() {
  : > "$LOG_FILE"
  write_status "running"
  acquire_deploy_lock

  trap 'rm -f "$LOCK_PID_FILE"; write_status failed:$?' ERR

  log "mode=$DEPLOY_MODE tag=$IMAGE_TAG services=$BUILD_SERVICES config_only=$CONFIG_ONLY"

  if [[ "$DEPLOY_MODE" == "build" ]]; then
    deploy_build
  elif [[ "$DEPLOY_MODE" == "pull" ]]; then
    deploy_pull
  else
    deploy_transfer
  fi

  write_status "done"
  rm -f "$LOCK_PID_FILE"
  log "done"
}

main "$@"
