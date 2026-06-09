#!/usr/bin/env bash
# Idempotent map.ir configuration for production .env
set -euo pipefail

ENV_FILE="${1:-/opt/agahiram/docker/.env}"
MAPIR_KEY="${MAPIR_API_KEY:?Set MAPIR_API_KEY before running this script}"

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

update_or_add "MAPIR_API_KEY" "$MAPIR_KEY"
update_or_add "NEXT_PUBLIC_MAPIR_API_KEY" "$MAPIR_KEY"

echo "[configure-mapir-env] Map.ir settings applied to $ENV_FILE"
grep -E '^(MAPIR|NEXT_PUBLIC_MAPIR)' "$ENV_FILE" | sed 's/=.*/=***/'
