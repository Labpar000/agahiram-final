#!/bin/bash
# Fast update: git pull config + pull images from GHCR (no build on VPS).
#
# Usage:
#   IMAGE_TAG=<git-sha> bash scripts/update.sh
#   bash scripts/update.sh api web
#   FORCE_FULL=1 bash scripts/update.sh

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/agahiram}"
cd "$APP_DIR"

BEFORE_SHA="$(git rev-parse HEAD 2>/dev/null || echo '')"
git pull
AFTER_SHA="$(git rev-parse HEAD 2>/dev/null || echo '')"

if [[ -n "$*" ]]; then
  BUILD_SERVICES="$*"
  CONFIG_ONLY=""
elif [[ "${FORCE_FULL:-0}" == "1" ]]; then
  BUILD_SERVICES="api worker web admin"
  CONFIG_ONLY=""
else
  eval "$(bash scripts/detect-build-services.sh --env "${BEFORE_SHA:-HEAD~1}" "$AFTER_SHA")"
fi

export DEPLOY_MODE=pull
export IMAGE_TAG="${IMAGE_TAG:-$AFTER_SHA}"
export BUILD_SERVICES
export CONFIG_ONLY="${CONFIG_ONLY:-}"
export CONFIG_TARBALL=""
export APP_DIR

bash scripts/remote-deploy.sh
