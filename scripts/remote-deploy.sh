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
BUILD_SERVICES="${BUILD_SERVICES:-api worker web admin}"
CONFIG_ONLY="${CONFIG_ONLY:-}"
DEPLOY_MODE="${DEPLOY_MODE:-transfer}"
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

ghcr_login() {
  if [[ -n "${GHCR_TOKEN:-}" ]]; then
    log "logging in to ghcr.io..."
    echo "$GHCR_TOKEN" | docker login ghcr.io -u "${GHCR_USER:-Labpar000}" --password-stdin
  fi
}

deploy_transfer() {
  if [[ -n "${CONFIG_TARBALL:-}" ]]; then
    extract_config "$CONFIG_TARBALL" "${CONFIG_SHA256:-}"
  elif [[ -n "${SRC_TARBALL:-}" ]]; then
    extract_source "$SRC_TARBALL" "${SRC_SHA256:-}"
  fi

  migrate_minio_env

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
  docker compose $COMPOSE up -d postgres redis meilisearch minio
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
    log "running database migrations..."
    docker compose $COMPOSE run --rm --workdir /app api sh -lc \
      '/app/node_modules/.bin/prisma migrate deploy --schema /app/packages/database/prisma/schema.prisma'
  fi

  log "restarting application containers..."
  recreate=( )
  if [[ -n "${BUILD_SERVICES// /}" ]]; then
    read -r -a recreate <<< "$BUILD_SERVICES"
  fi
  recreate+=("caddy")
  if [[ -n "$CONFIG_ONLY" && " ${recreate[*]} " != *" $CONFIG_ONLY "* ]]; then
    recreate+=("$CONFIG_ONLY")
  fi
  # shellcheck disable=SC2086
  docker compose $COMPOSE up -d --force-recreate "${recreate[@]}"
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
  ghcr_login

  cd "$APP_DIR/docker"
  export IMAGE_REGISTRY IMAGE_TAG

  log "ensuring infra containers..."
  docker compose $COMPOSE up -d postgres redis meilisearch minio
  docker compose $COMPOSE up -d createbuckets

  if [[ -n "$CONFIG_ONLY" && -z "${BUILD_SERVICES// /}" ]]; then
    log "config-only deploy: recreating $CONFIG_ONLY"
    docker compose $COMPOSE up -d --force-recreate "$CONFIG_ONLY"
    docker compose $COMPOSE ps
    return 0
  fi

  if [[ -n "${BUILD_SERVICES// /}" ]]; then
    log "pulling images (tag=$IMAGE_TAG): $BUILD_SERVICES"
    # shellcheck disable=SC2086
    docker compose $COMPOSE pull $BUILD_SERVICES
  fi

  if [[ " $BUILD_SERVICES " == *" api "* || " $BUILD_SERVICES " == *" worker "* ]]; then
    log "running database migrations..."
    docker compose $COMPOSE run --rm --workdir /app api sh -lc \
      '/app/node_modules/.bin/prisma migrate deploy --schema /app/packages/database/prisma/schema.prisma'
  fi

  log "restarting application containers..."
  recreate=( )
  if [[ -n "${BUILD_SERVICES// /}" ]]; then
    read -r -a recreate <<< "$BUILD_SERVICES"
  fi
  recreate+=("caddy")
  if [[ -n "$CONFIG_ONLY" && " ${recreate[*]} " != *" $CONFIG_ONLY "* ]]; then
    recreate+=("$CONFIG_ONLY")
  fi
  # shellcheck disable=SC2086
  docker compose $COMPOSE up -d --force-recreate "${recreate[@]}"
  docker image prune -f
  docker compose $COMPOSE ps
}

deploy_build() {
  if [[ -n "${SRC_TARBALL:-}" ]]; then
    extract_source "$SRC_TARBALL" "${SRC_SHA256:-}"
  fi

  migrate_minio_env

  cd "$APP_DIR/docker"
  export DOCKER_BUILDKIT=1
  export COMPOSE_DOCKER_CLI_BUILD=1

  log "ensuring infra containers..."
  docker compose $COMPOSE up -d postgres redis meilisearch minio
  docker compose $COMPOSE up -d createbuckets

  log "building (parallel, fallback mode): $BUILD_SERVICES"
  # shellcheck disable=SC2086
  docker compose $COMPOSE_BUILD build --parallel $BUILD_SERVICES

  if [[ " $BUILD_SERVICES " == *" api "* || " $BUILD_SERVICES " == *" worker "* ]]; then
    log "running database migrations..."
    docker compose $COMPOSE run --rm --workdir /app api sh -lc \
      '/app/node_modules/.bin/prisma migrate deploy --schema /app/packages/database/prisma/schema.prisma'
  fi

  log "restarting application containers..."
  # shellcheck disable=SC2086
  docker compose $COMPOSE up -d --force-recreate $BUILD_SERVICES caddy
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
