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
STATUS_FILE="${STATUS_FILE:-/tmp/agahiram-deploy.status}"
LOG_FILE="${LOG_FILE:-/tmp/agahiram-deploy.log}"

COMPOSE="-f docker-compose.prod.yml"
COMPOSE_BUILD="-f docker-compose.prod.yml -f docker-compose.build.yml"

log() { echo "[deploy] $*" | tee -a "$LOG_FILE"; }

write_status() {
  echo "$1" > "$STATUS_FILE"
}

run_db_migrate_and_seed() {
  log "running database migrations..."
  docker compose $COMPOSE run --rm --workdir /app api sh -lc \
    '/app/node_modules/.bin/prisma migrate deploy --schema /app/packages/database/prisma/schema.prisma'
  log "running database seed (idempotent)..."
  docker compose $COMPOSE run --rm --workdir /app api sh -lc \
    'cd /app/packages/database && node --experimental-strip-types prisma/seed.ts'
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

  exec 9>"$LOCK_FILE"
  if ! flock -n 9; then
    log "another deploy is in progress — exiting"
    write_status "failed:locked"
    exit 1
  fi

  trap 'write_status failed:$?' ERR

  log "mode=$DEPLOY_MODE tag=$IMAGE_TAG services=$BUILD_SERVICES config_only=$CONFIG_ONLY"

  if [[ "$DEPLOY_MODE" == "build" ]]; then
    deploy_build
  elif [[ "$DEPLOY_MODE" == "pull" ]]; then
    deploy_pull
  else
    deploy_transfer
  fi

  write_status "done"
  log "done"
}

main "$@"
