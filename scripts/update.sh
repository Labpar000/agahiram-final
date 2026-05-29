#!/bin/bash
# به‌روزرسانی سریع از git + rebuild + restart با حفظ داده
#
# به‌صورت پیش‌فرض فقط سرویس‌هایی که فایل‌هایشان بین HEAD قبلی و بعد از pull
# تغییر کرده‌اند را rebuild می‌کند. برای rebuild کامل: FORCE_FULL=1 bash scripts/update.sh
# همچنین می‌توان سرویس‌ها را دستی پاس داد: bash scripts/update.sh api web

set -e
APP_DIR="${APP_DIR:-/opt/agahiram}"
cd "$APP_DIR"

BEFORE_SHA="$(git rev-parse HEAD 2>/dev/null || echo '')"
git pull
AFTER_SHA="$(git rev-parse HEAD 2>/dev/null || echo '')"

ALL_SERVICES="api web admin worker"

# تعیین سرویس‌های هدف
SERVICES=""
if [[ -n "$*" ]]; then
  # سرویس‌ها از آرگومان‌های ورودی
  SERVICES="$*"
elif [[ "${FORCE_FULL:-0}" == "1" || -z "$BEFORE_SHA" || -z "$AFTER_SHA" || "$BEFORE_SHA" == "$AFTER_SHA" ]]; then
  # rebuild کامل اگر اجباری باشد، یا نتوانیم diff بگیریم، یا چیزی pull نشده
  # (اگر چیزی pull نشده، یعنی فقط restart با cache فعلی—همه سرویس‌ها سریع build می‌شوند)
  SERVICES="$ALL_SERVICES"
else
  CHANGED="$(git diff --name-only "$BEFORE_SHA" "$AFTER_SHA")"
  full_rebuild=0
  declare -A want=()
  while IFS= read -r path; do
    [[ -z "$path" ]] && continue
    case "$path" in
      package.json|pnpm-lock.yaml|pnpm-workspace.yaml|.npmrc|turbo.json|packages/config/*|docker/docker-compose.prod.yml)
        full_rebuild=1 ;;
      packages/shared/*)
        full_rebuild=1 ;;
      apps/api/*|packages/database/*) want[api]=1; want[worker]=1 ;;
      workers/media-processor/*) want[worker]=1 ;;
      apps/web/*) want[web]=1 ;;
      apps/admin/*) want[admin]=1 ;;
      packages/ui/*) want[web]=1; want[admin]=1 ;;
      docker/Dockerfile.api) want[api]=1 ;;
      docker/Dockerfile.web) want[web]=1 ;;
      docker/Dockerfile.admin) want[admin]=1 ;;
      docker/Dockerfile.worker) want[worker]=1 ;;
    esac
  done <<< "$CHANGED"

  if [[ "$full_rebuild" == "1" || "${#want[@]}" == "0" ]]; then
    SERVICES="$ALL_SERVICES"
  else
    SERVICES="${!want[*]}"
  fi
fi

echo "[update] build scope: $SERVICES"

cd docker
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
# نکته: اینجا cache build را پاک نمی‌کنیم. مدیریت دیسک از طریق BuildKit GC
# در /etc/docker/daemon.json (defaultKeepStorage) انجام می‌شود تا rebuildها سریع بمانند.

docker compose -f docker-compose.prod.yml up -d postgres redis meilisearch

for svc in $SERVICES; do
  docker compose -f docker-compose.prod.yml build "$svc"
done

# اجرای migration فقط اگر api یا worker در scope باشند
if [[ " $SERVICES " == *" api "* || " $SERVICES " == *" worker "* ]]; then
  docker compose -f docker-compose.prod.yml run --rm api pnpm --filter @agahiram/database migrate:deploy
fi

docker compose -f docker-compose.prod.yml up -d --force-recreate $SERVICES caddy
docker image prune -f
echo "[update] done"
