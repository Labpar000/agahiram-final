#!/bin/bash
# Configure LiveKit + Web Push env and firewall for voice/video calls.
set -euo pipefail

ENV_FILE="${1:-/opt/agahiram/docker/.env}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIVEKIT_YAML="${LIVEKIT_YAML:-$(dirname "$SCRIPT_DIR")/docker/livekit.yaml}"

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
LIVEKIT_API_KEY_VAL="$(grep '^LIVEKIT_API_KEY=' "$ENV_FILE" 2>/dev/null | tr -d '\r' | cut -d= -f2- || echo agahiram_lk)"
if [[ -z "$LIVEKIT_API_KEY_VAL" ]]; then
  LIVEKIT_API_KEY_VAL="agahiram_lk"
fi

# LiveKit
set_env LIVEKIT_API_KEY "$LIVEKIT_API_KEY_VAL"
if ! grep -q '^LIVEKIT_API_SECRET=.\+' "$ENV_FILE" 2>/dev/null; then
  set_env LIVEKIT_API_SECRET "db8cc209f57dc7a569aa7d5c789d96968abf14e7b04e8050263dc1f94016c129"
fi
set_env LIVEKIT_URL "wss://${DOMAIN}/livekit"
set_env LIVEKIT_INTERNAL_URL "http://livekit:7880"

# Public IP for LiveKit ICE / TURN (auto-detect if unset)
NODE_IP="$(grep '^LIVEKIT_NODE_IP=' "$ENV_FILE" 2>/dev/null | tr -d '\r' | cut -d= -f2- || true)"
if [[ -z "$NODE_IP" ]]; then
  NODE_IP="$(curl -fsS --max-time 5 https://ifconfig.me/ip 2>/dev/null || curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || true)"
  if [[ -n "$NODE_IP" ]]; then
    set_env LIVEKIT_NODE_IP "$NODE_IP"
    echo "[configure-voice-video] detected LIVEKIT_NODE_IP=$NODE_IP"
  else
    ensure_env LIVEKIT_NODE_IP ""
    echo "[configure-voice-video] warning: could not detect LIVEKIT_NODE_IP — set it manually in $ENV_FILE"
  fi
else
  echo "[configure-voice-video] using LIVEKIT_NODE_IP=$NODE_IP"
fi

# Webhook — internal docker URL is more reliable than hairpin via public domain
WEBHOOK_URL="$(grep '^LIVEKIT_WEBHOOK_URL=' "$ENV_FILE" 2>/dev/null | tr -d '\r' | cut -d= -f2- || true)"
if [[ -z "$WEBHOOK_URL" ]]; then
  WEBHOOK_URL="http://api:4000/api/v1/livekit/webhook"
  set_env LIVEKIT_WEBHOOK_URL "$WEBHOOK_URL"
fi

# Patch livekit.yaml placeholders for TURN and webhooks
if [[ -f "$LIVEKIT_YAML" ]]; then
  sed -i "s|__LIVEKIT_TURN_DOMAIN__|${DOMAIN}|g" "$LIVEKIT_YAML"
  sed -i "s|__LIVEKIT_API_KEY__|${LIVEKIT_API_KEY_VAL}|g" "$LIVEKIT_YAML"
  sed -i "s|__LIVEKIT_WEBHOOK_URL__|${WEBHOOK_URL}|g" "$LIVEKIT_YAML"
  if [[ -n "$NODE_IP" ]]; then
    if grep -q '^  node_ip:' "$LIVEKIT_YAML" 2>/dev/null; then
      sed -i "s|^  node_ip:.*|  node_ip: ${NODE_IP}|" "$LIVEKIT_YAML"
    else
      sed -i "/^  use_external_ip:/a\\  node_ip: ${NODE_IP}" "$LIVEKIT_YAML"
    fi
  fi
  echo "[configure-voice-video] patched $LIVEKIT_YAML (webhook=$WEBHOOK_URL)"
fi

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
  ufw allow 3478/udp comment 'LiveKit TURN UDP' >/dev/null 2>&1 || true
  ufw allow 5349/tcp comment 'LiveKit TURN TLS' >/dev/null 2>&1 || true
  ufw allow 50000:50100/udp comment 'LiveKit media ports' >/dev/null 2>&1 || true
  ufw reload >/dev/null 2>&1 || true
  echo "[configure-voice-video] ufw rules applied"
fi
