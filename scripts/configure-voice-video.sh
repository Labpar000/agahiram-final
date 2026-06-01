#!/bin/bash
# Configure LiveKit + Web Push env and firewall for voice/video calls.
set -euo pipefail

ENV_FILE="${1:-/opt/agahiram/docker/.env}"

set_env() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

ensure_env() {
  local key="$1"
  local val="$2"
  if ! grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

[[ -f "$ENV_FILE" ]] || { echo "missing $ENV_FILE"; exit 1; }

# Strip Windows CRLF if present (breaks sed/docker env parsing on Linux)
sed -i 's/\r$//' "$ENV_FILE" 2>/dev/null || true

DOMAIN="$(grep '^DOMAIN=' "$ENV_FILE" | tr -d '\r' | cut -d= -f2- || echo alooche.com)"

# LiveKit
set_env LIVEKIT_API_KEY "agahiram_lk"
if ! grep -q '^LIVEKIT_API_SECRET=.\+' "$ENV_FILE" 2>/dev/null; then
  set_env LIVEKIT_API_SECRET "db8cc209f57dc7a569aa7d5c789d96968abf14e7b04e8050263dc1f94016c129"
fi
set_env LIVEKIT_URL "wss://${DOMAIN}/livekit"
set_env LIVEKIT_INTERNAL_URL "http://livekit:7880"

# Web Push (VAPID)
ensure_env VAPID_PUBLIC_KEY "BHYputbdYqz1YfZ7aAcPPbC4KiWlwIL3x1Wz6zlEDAtC3GylDIKmLziLluae9V2_Pn2RRiIkOHM8Ngi3j9TnQKY"
if ! grep -q '^VAPID_PRIVATE_KEY=.\+' "$ENV_FILE" 2>/dev/null; then
  set_env VAPID_PRIVATE_KEY "Txp5uwI3ICL4D3jDPagWuoNX9yDhWi6nO50i7ZJHQQg"
fi
ensure_env VAPID_SUBJECT "mailto:admin@${DOMAIN}"

echo "[configure-voice-video] env updated in $ENV_FILE"

# Firewall — LiveKit RTC media (signaling goes through Caddy :443)
if command -v ufw >/dev/null 2>&1; then
  ufw allow 7880/tcp comment 'LiveKit HTTP' >/dev/null 2>&1 || true
  ufw allow 7881/tcp comment 'LiveKit RTC TCP' >/dev/null 2>&1 || true
  ufw allow 7882/udp comment 'LiveKit RTC UDP' >/dev/null 2>&1 || true
  ufw allow 50000:50100/udp comment 'LiveKit media ports' >/dev/null 2>&1 || true
  ufw reload >/dev/null 2>&1 || true
  echo "[configure-voice-video] ufw rules applied"
fi
