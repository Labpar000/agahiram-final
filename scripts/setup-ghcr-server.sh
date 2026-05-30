#!/bin/bash
# One-time / refresh GHCR pull credentials on the production VPS.
# Usage (on server):
#   GHCR_TOKEN=<read_packages_pat> bash scripts/setup-ghcr-server.sh
#
# Or from PC:
#   ssh root@45.144.18.86 'GHCR_TOKEN=... bash -s' < scripts/setup-ghcr-server.sh
set -euo pipefail

GHCR_USER="${GHCR_USER:-Labpar000}"
TOKEN="${GHCR_TOKEN:-}"

if [[ -z "$TOKEN" ]]; then
  echo "Set GHCR_TOKEN (GitHub PAT with read:packages)" >&2
  exit 1
fi

echo "$TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin

# Persist for reboots (optional — deploy also logs in each run)
mkdir -p /root/.docker
echo "GHCR login OK for $GHCR_USER"

# Smoke-test pull (web is usually present after first deploy)
IMAGE="${IMAGE_REGISTRY:-ghcr.io/labpar000/agahiram}/web:latest"
if [[ "${SKIP_PULL_TEST:-0}" == "1" ]]; then
  echo "Skipping pull test (SKIP_PULL_TEST=1)"
elif docker pull "$IMAGE"; then
  echo "Pull test OK: $IMAGE"
else
  echo "WARN: Pull test failed: $IMAGE — run again after first CI build pushes images" >&2
fi
