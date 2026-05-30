#!/bin/bash
# Unified production deploy — used by GitHub Actions and manual tarball deploy.
#
# Usage on server:
#   APP_DIR=/opt/agahiram SRC_TARBALL=/tmp/agahiram-src.tar.gz bash scripts/remote-deploy.sh
#   BUILD_SERVICES="api web" bash scripts/remote-deploy.sh
#
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/agahiram}"
ENV_FILE="$APP_DIR/docker/.env"
BUILD_SERVICES="${BUILD_SERVICES:-api worker web admin}"
DOMAIN="${DOMAIN:-alooche.com}"

log() { echo "[deploy] $*"; }

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

if [[ -n "${SRC_TARBALL:-}" ]]; then
  log "extracting $SRC_TARBALL -> $APP_DIR"
  mkdir -p "$APP_DIR"
  tar -xzf "$SRC_TARBALL" -C "$APP_DIR"
fi

migrate_minio_env

cd "$APP_DIR/docker"
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

log "ensuring infra containers..."
docker compose -f docker-compose.prod.yml up -d postgres redis meilisearch minio
docker compose -f docker-compose.prod.yml up -d createbuckets

log "building (parallel): $BUILD_SERVICES"
docker compose -f docker-compose.prod.yml build --parallel $BUILD_SERVICES

if [[ " $BUILD_SERVICES " == *" api "* || " $BUILD_SERVICES " == *" worker "* ]]; then
  log "running database migrations..."
  docker compose -f docker-compose.prod.yml run --rm --workdir /app api sh -lc \
    '/app/node_modules/.bin/prisma migrate deploy --schema /app/packages/database/prisma/schema.prisma'
fi

log "restarting application containers..."
docker compose -f docker-compose.prod.yml up -d --force-recreate $BUILD_SERVICES caddy
docker image prune -f
docker compose -f docker-compose.prod.yml ps

log "done"
