#!/usr/bin/env bash
# Verify CDN/API returns HTTP 206 for byte-range (required for iOS Safari video).
set -euo pipefail
URL="${1:?Usage: check-media-range.sh <media-url>}"
echo "Testing Range on: $URL"
STATUS=$(curl -sS -o /dev/null -w "%{http_code}" -H "Range: bytes=0-1" "$URL")
echo "HTTP status: $STATUS"
if [[ "$STATUS" == "206" ]]; then
  echo "OK: byte-range supported (iOS video ready)"
  exit 0
fi
echo "FAIL: expected 206 Partial Content for iOS/WebKit video playback"
exit 1
