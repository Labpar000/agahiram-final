#!/usr/bin/env bash
# Automated preflight before deploy — pairs with docs/BROWSER-QA-2026.md (manual matrix).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> QA preflight 2026"
pnpm format:check
pnpm lint
pnpm build

if [[ -n "${MEDIA_RANGE_TEST_URL:-}" ]]; then
  echo "==> Media byte-range (206)"
  bash scripts/check-media-range.sh "$MEDIA_RANGE_TEST_URL"
else
  echo "==> Skip media 206 (set MEDIA_RANGE_TEST_URL to enable)"
fi

echo ""
echo "OK: automated checks passed."
echo "Manual: complete docs/BROWSER-QA-2026.md on Safari iOS 18+ and Chrome Android 130+"
