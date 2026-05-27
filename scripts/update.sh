#!/bin/bash
# به‌روزرسانی سریع از git + rebuild + restart با حفظ داده

set -e
APP_DIR="${APP_DIR:-/opt/agahiram}"
cd "$APP_DIR"
git pull
cd docker
docker compose -f docker-compose.prod.yml build api web admin worker
docker compose -f docker-compose.prod.yml run --rm api pnpm --filter @agahiram/database migrate:deploy
docker compose -f docker-compose.prod.yml up -d api web admin worker
echo "[update] done"
