#!/usr/bin/env bash
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/agahiram}"
OLD_ENV="$APP_DIR/.env"
NEW_ENV="$APP_DIR/docker/.env"

docker stop agahiram-postgres agahiram-redis 2>/dev/null || true

if [[ -f "$APP_DIR/docker/.env.example" && ! -f "$NEW_ENV" ]]; then
  cp "$APP_DIR/docker/.env.example" "$NEW_ENV"
  POSTGRES_PASS=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)
  REDIS_PASS=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)
  MEILI_KEY=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)
  JWT_SEC=$(openssl rand -base64 48 | tr -d '/+=' | head -c 64)
  JWT_REFRESH=$(openssl rand -base64 48 | tr -d '/+=' | head -c 64)
  COOKIE_SEC=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)
  MINIO_PASS=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)
  LK_SEC=$(openssl rand -hex 32)
  sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$POSTGRES_PASS|" "$NEW_ENV"
  sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://agahiram:$POSTGRES_PASS@postgres:5432/agahiram?schema=public|" "$NEW_ENV"
  sed -i "s|REDIS_URL=.*|REDIS_URL=redis://:$REDIS_PASS@redis:6379|" "$NEW_ENV"
  grep -q '^REDIS_PASSWORD=' "$NEW_ENV" || echo "REDIS_PASSWORD=$REDIS_PASS" >> "$NEW_ENV"
  sed -i "s|MEILI_MASTER_KEY=.*|MEILI_MASTER_KEY=$MEILI_KEY|" "$NEW_ENV"
  sed -i "s|MEILI_HOST=.*|MEILI_HOST=http://meilisearch:7700|" "$NEW_ENV"
  sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SEC|" "$NEW_ENV"
  sed -i "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$JWT_REFRESH|" "$NEW_ENV"
  grep -q '^COOKIE_SECRET=' "$NEW_ENV" || echo "COOKIE_SECRET=$COOKIE_SEC" >> "$NEW_ENV"
  sed -i "s|COOKIE_SECURE=.*|COOKIE_SECURE=true|" "$NEW_ENV"
  sed -i "s|MINIO_ROOT_PASSWORD=.*|MINIO_ROOT_PASSWORD=$MINIO_PASS|" "$NEW_ENV"
  sed -i "s|MINIO_SECRET_KEY=.*|MINIO_SECRET_KEY=$MINIO_PASS|" "$NEW_ENV"
  sed -i "s|DOMAIN=.*|DOMAIN=alooche.com|" "$NEW_ENV"
  sed -i "s|ADMIN_PHONES=.*|ADMIN_PHONES=09127477990|" "$NEW_ENV"
  sed -i "s|SMS_PROVIDER=.*|SMS_PROVIDER=smsir|" "$NEW_ENV"
  sed -i "s|^SMS_IR_API_KEY=.*|SMS_IR_API_KEY=95rdSxrnOS2hHkbbkdSt6jlIjnMaHyYuY2p5E6qNqHwAQa5E|" "$NEW_ENV"
  sed -i "s|^SMS_IR_TEMPLATE_ID=.*|SMS_IR_TEMPLATE_ID=307289|" "$NEW_ENV"
  sed -i "s|^SMS_IR_PARAM_NAME=.*|SMS_IR_PARAM_NAME=Code|" "$NEW_ENV"
  sed -i "s|LIVEKIT_API_SECRET=.*|LIVEKIT_API_SECRET=$LK_SEC|" "$NEW_ENV"
  echo "env-bootstrapped"
fi

if [[ -f "$OLD_ENV" && -f "$NEW_ENV" ]]; then
  sms_key=$(grep -E '^(SMS_IR_API_KEY|SMSIR_API_KEY)=' "$OLD_ENV" | head -1 | cut -d= -f2- || true)
  tpl=$(grep -E '^(SMS_IR_TEMPLATE_ID|SMSIR_TEMPLATE_ID)=' "$OLD_ENV" | head -1 | cut -d= -f2- || true)
  param=$(grep -E '^(SMS_IR_PARAM_NAME|SMSIR_PARAM_NAME)=' "$OLD_ENV" | head -1 | cut -d= -f2- || true)
  if [[ -n "$sms_key" ]]; then
    if grep -q '^SMS_IR_API_KEY=' "$NEW_ENV"; then
      sed -i "s|^SMS_IR_API_KEY=.*|SMS_IR_API_KEY=$sms_key|" "$NEW_ENV"
    else
      echo "SMS_IR_API_KEY=$sms_key" >> "$NEW_ENV"
    fi
    tpl="${tpl:-307289}"
    param="${param:-Code}"
    if grep -q '^SMS_IR_TEMPLATE_ID=' "$NEW_ENV"; then
      sed -i "s|^SMS_IR_TEMPLATE_ID=.*|SMS_IR_TEMPLATE_ID=$tpl|" "$NEW_ENV"
    else
      echo "SMS_IR_TEMPLATE_ID=$tpl" >> "$NEW_ENV"
    fi
    if grep -q '^SMS_IR_PARAM_NAME=' "$NEW_ENV"; then
      sed -i "s|^SMS_IR_PARAM_NAME=.*|SMS_IR_PARAM_NAME=$param|" "$NEW_ENV"
    else
      echo "SMS_IR_PARAM_NAME=$param" >> "$NEW_ENV"
    fi
    echo "sms-migrated"
  fi
fi

grep -E '^(ADMIN_PHONES|SMS_PROVIDER|SMS_IR_API_KEY|DOMAIN)=' "$NEW_ENV" 2>/dev/null | sed 's/\(SMS_IR_API_KEY=\).*/\1***/' || true
