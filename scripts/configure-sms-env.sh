#!/usr/bin/env bash
# Idempotent sms.ir OTP configuration for production .env
set -euo pipefail

ENV_FILE="${1:-/opt/agahiram/docker/.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "env file not found: $ENV_FILE" >&2
  exit 1
fi

update_or_add() {
  local key="$1"
  local value="$2"
  if grep -qE "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    echo "${key}=${value}" >> "$ENV_FILE"
  fi
}

# sms.ir verify template (service line) — preferred for OTP
update_or_add "SMS_PROVIDER" "smsir"
update_or_add "SMS_IR_API_KEY" "${SMS_IR_API_KEY:?Set SMS_IR_API_KEY before running this script}"
update_or_add "SMS_IR_TEMPLATE_ID" "${SMS_IR_TEMPLATE_ID:-307289}"
update_or_add "SMS_IR_PARAM_NAME" "${SMS_IR_PARAM_NAME:-Code}"
update_or_add "SMS_IR_LINE_NUMBER" "${SMS_IR_LINE_NUMBER:-10000009000100}"

# Disable kavenegar fallback unless explicitly configured
update_or_add "KAVENEGAR_API_KEY" ""
update_or_add "KAVENEGAR_DEV_MODE" "true"

echo "[configure-sms-env] SMS settings applied to $ENV_FILE"
grep -E '^(SMS_|KAVENEGAR_)' "$ENV_FILE" | sed 's/\(SMS_IR_API_KEY=\).*/\1***/'
