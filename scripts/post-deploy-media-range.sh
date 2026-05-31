#!/usr/bin/env bash
# Run on server after deploy — verifies media CDN returns HTTP 206 for iOS video.
set -euo pipefail
BASE="${1:-https://alooche.com}"
SAMPLE_KEY="${2:-}"
if [[ -z "$SAMPLE_KEY" ]]; then
  echo "Usage: post-deploy-media-range.sh [base-url] [media-object-key]"
  echo "Example: post-deploy-media-range.sh https://alooche.com uploads/demo.mp4"
  exit 1
fi
URL="${BASE%/}/api/v1/media/object?key=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$SAMPLE_KEY'))" 2>/dev/null || echo "$SAMPLE_KEY")"
exec bash "$(dirname "$0")/check-media-range.sh" "$URL"
