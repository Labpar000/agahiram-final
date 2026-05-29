#!/bin/bash
# به‌روزرسانی سریع از git + rebuild + restart با حفظ داده

set -e
APP_DIR="${APP_DIR:-/opt/agahiram}"
cd "$APP_DIR"
git pull
cd docker
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
docker builder prune -af >/dev/null 2>&1 || true
for svc in api web admin worker; do
  docker compose -f docker-compose.prod.yml build "$svc"
done
docker compose -f docker-compose.prod.yml run --rm api pnpm --filter @agahiram/database migrate:deploy
docker compose -f docker-compose.prod.yml up -d --force-recreate api web admin worker caddy
echo "[update] done"
