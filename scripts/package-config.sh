#!/bin/bash
# Package docker/ + scripts/ for fast config sync during pull-mode deploy.
set -euo pipefail

OUT="${1:-/tmp/agahiram-config.tar.gz}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

tar -czf "$OUT" \
  -C "$ROOT" \
  docker/Caddyfile \
  docker/docker-compose.prod.yml \
  docker/docker-compose.build.yml \
  scripts/remote-deploy.sh \
  scripts/detect-build-services.sh \
  scripts/package-config.sh \
  scripts/update.sh \
  2>/dev/null || \
tar -czf "$OUT" \
  -C "$ROOT" \
  docker \
  scripts/remote-deploy.sh \
  scripts/detect-build-services.sh \
  scripts/package-config.sh \
  scripts/update.sh

echo "$OUT"
