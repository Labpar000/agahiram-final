#!/bin/bash
# آگهی‌گرام - اسکریپت دیپلوی صفر تا صد روی VPS اوبونتو ۲۲.۰۴+
# استفاده: bash deploy.sh

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[deploy]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC} $1"; }
err() { echo -e "${RED}[error]${NC} $1"; exit 1; }

REPO_URL="${REPO_URL:-git@github.com:Labpar000/agahiram.git}"
APP_DIR="${APP_DIR:-/opt/agahiram}"
DOMAIN="${DOMAIN:-alooche.com}"
EMAIL="${EMAIL:-admin@${DOMAIN}}"
# Optional apt mirror override (empty = use the distro defaults; this VPS has
# unrestricted international internet so no Iran mirror is needed).
APT_MIRROR="${APT_MIRROR:-}"
SRC_TARBALL="${SRC_TARBALL:-/tmp/agahiram-src.tar.gz}"

if [[ "$EUID" -ne 0 ]]; then err "این اسکریپت باید با sudo اجرا شود"; fi

log "1/8 نصب Docker و ابزارها..."
if [[ -n "$APT_MIRROR" && -f /etc/apt/sources.list ]]; then
  cp /etc/apt/sources.list /etc/apt/sources.list.bak.$(date +%Y%m%d%H%M%S)
  sed -i "s|http://archive.ubuntu.com/ubuntu|$APT_MIRROR|g" /etc/apt/sources.list || true
  sed -i "s|http://security.ubuntu.com/ubuntu|$APT_MIRROR|g" /etc/apt/sources.list || true
  sed -i "s|http://ports.ubuntu.com/ubuntu-ports|$APT_MIRROR|g" /etc/apt/sources.list || true
fi
apt-get update
apt-get install -y git openssl curl ufw docker.io docker-compose-v2
systemctl enable --now docker

log "3/8 پیکربندی فایروال..."
ufw allow 22/tcp || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
echo "y" | ufw enable || true

log "4/8 دریافت/به‌روزرسانی کد پروژه..."
mkdir -p "$APP_DIR"
if [[ -f "$SRC_TARBALL" ]]; then
  log "استفاده از سورس آفلاین: $SRC_TARBALL"
  tar -xzf "$SRC_TARBALL" -C "$APP_DIR"
  cd "$APP_DIR"
elif [[ -d "$APP_DIR/.git" ]]; then
  cd "$APP_DIR"
  git pull
else
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

log "5/8 تولید فایل .env با secrets تصادفی..."
if [[ ! -f "$APP_DIR/docker/.env" ]]; then
  cp "$APP_DIR/docker/.env.example" "$APP_DIR/docker/.env"

  POSTGRES_PASS=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)
  REDIS_PASS=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)
  MEILI_KEY=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)
  JWT_SEC=$(openssl rand -base64 48 | tr -d '/+=' | head -c 64)
  JWT_REFRESH=$(openssl rand -base64 48 | tr -d '/+=' | head -c 64)
  COOKIE_SEC=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)
  MINIO_PASS=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)

  sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$POSTGRES_PASS|" "$APP_DIR/docker/.env"
  sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://agahiram:$POSTGRES_PASS@postgres:5432/agahiram?schema=public|" "$APP_DIR/docker/.env"
  sed -i "s|REDIS_URL=.*|REDIS_URL=redis://:$REDIS_PASS@redis:6379|" "$APP_DIR/docker/.env"
  echo "REDIS_PASSWORD=$REDIS_PASS" >> "$APP_DIR/docker/.env"
  sed -i "s|MEILI_MASTER_KEY=.*|MEILI_MASTER_KEY=$MEILI_KEY|" "$APP_DIR/docker/.env"
  sed -i "s|MEILI_HOST=.*|MEILI_HOST=http://meilisearch:7700|" "$APP_DIR/docker/.env"
  sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SEC|" "$APP_DIR/docker/.env"
  sed -i "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$JWT_REFRESH|" "$APP_DIR/docker/.env"
  echo "COOKIE_SECRET=$COOKIE_SEC" >> "$APP_DIR/docker/.env"

  # MinIO object storage (creds are reused as the S3 access/secret keys).
  sed -i "s|MINIO_ROOT_PASSWORD=.*|MINIO_ROOT_PASSWORD=$MINIO_PASS|" "$APP_DIR/docker/.env"
  sed -i "s|S3_SECRET_KEY=.*|S3_SECRET_KEY=$MINIO_PASS|" "$APP_DIR/docker/.env"

  sed -i "s|DOMAIN=.*|DOMAIN=$DOMAIN|" "$APP_DIR/docker/.env"
  sed -i "s|ACME_EMAIL=.*|ACME_EMAIL=$EMAIL|" "$APP_DIR/docker/.env"
  sed -i "s|MEILI_HOST=.*|MEILI_HOST=http://meilisearch:7700|" "$APP_DIR/docker/.env"
  sed -i "s|S3_PUBLIC_ENDPOINT=.*|S3_PUBLIC_ENDPOINT=https://s3.$DOMAIN|" "$APP_DIR/docker/.env"
  sed -i "s|S3_PUBLIC_URL=.*|S3_PUBLIC_URL=https://s3.$DOMAIN/agahiram|" "$APP_DIR/docker/.env"
  sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=https://$DOMAIN|" "$APP_DIR/docker/.env"
  sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://$DOMAIN|" "$APP_DIR/docker/.env"
  sed -i "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=https://$DOMAIN/api/v1|" "$APP_DIR/docker/.env"
  sed -i "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=https://$DOMAIN|" "$APP_DIR/docker/.env"
  sed -i "s|NEXT_PUBLIC_WS_URL=.*|NEXT_PUBLIC_WS_URL=wss://$DOMAIN|" "$APP_DIR/docker/.env"
  sed -i "s|NEXT_PUBLIC_SOCKET_URL=.*|NEXT_PUBLIC_SOCKET_URL=https://$DOMAIN|" "$APP_DIR/docker/.env"
  sed -i "s|ZARINPAL_CALLBACK_URL=.*|ZARINPAL_CALLBACK_URL=https://$DOMAIN/payment/callback|" "$APP_DIR/docker/.env"

  warn "فایل .env ساخته شد - حتماً KAVENEGAR_API_KEY و ZARINPAL_MERCHANT_ID و NESHAN_API_KEY را در آن وارد کنید"
  warn "مسیر: $APP_DIR/docker/.env"
fi

log "6/8 ساخت ایمیج‌ها و راه‌اندازی کانتینرها..."
cd "$APP_DIR/docker"
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d postgres redis meilisearch minio
sleep 10
docker compose -f docker-compose.prod.yml up -d createbuckets
docker compose -f docker-compose.prod.yml up -d

log "7/8 اجرای migration و seed دیتابیس..."
sleep 5
docker compose -f docker-compose.prod.yml run --rm api pnpm --filter @agahiram/database migrate:deploy
docker compose -f docker-compose.prod.yml run --rm api pnpm --filter @agahiram/database seed

log "8/8 ثبت cron برای پشتیبان‌گیری روزانه..."
CRON_LINE="0 3 * * * bash $APP_DIR/scripts/backup.sh > /var/log/agahiram-backup.log 2>&1"
(crontab -l 2>/dev/null | grep -v 'agahiram/scripts/backup' ; echo "$CRON_LINE") | crontab -

log "تمام! 🎉"
log "وب: https://${DOMAIN:-localhost}/"
log "ادمین: https://${DOMAIN:-localhost}/admin"
log "بررسی لاگ‌ها: docker compose -f $APP_DIR/docker/docker-compose.prod.yml logs -f"
