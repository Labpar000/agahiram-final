#!/bin/bash
# Decide deploy scope from changed paths.
#
# Usage:
#   bash scripts/detect-build-services.sh [BASE] [HEAD]
#     -> prints space-separated service names (backward compatible)
#
#   bash scripts/detect-build-services.sh --env [BASE] [HEAD]
#     -> prints BUILD_SERVICES, CONFIG_ONLY, NEED_CONFIG_SYNC for eval/source
#
# Override: BUILD_SERVICES="web" CONFIG_ONLY="caddy" bash scripts/remote-deploy.sh
set -euo pipefail

format="text"

if [[ "${1:-}" == "--env" ]]; then
  format="env"
  shift
fi

if [[ -n "${BUILD_SERVICES:-}" ]]; then
  if [[ "$format" == "env" ]]; then
    echo "BUILD_SERVICES=\"${BUILD_SERVICES}\""
    echo "CONFIG_ONLY=\"${CONFIG_ONLY:-}\""
    echo "NEED_CONFIG_SYNC=\"${NEED_CONFIG_SYNC:-1}\""
  else
    echo "$BUILD_SERVICES"
  fi
  exit 0
fi

BASE="${1:-HEAD~1}"
HEAD="${2:-HEAD}"

need_api=0 need_worker=0 need_web=0 need_admin=0
config_caddy=0 need_config_sync=0

apply_full_rebuild() {
  need_api=1
  need_worker=1
  need_web=1
  need_admin=1
}

if ! git rev-parse "$BASE" >/dev/null 2>&1; then
  apply_full_rebuild
  need_config_sync=1
else
  mapfile -t files < <(git diff --name-only "$BASE" "$HEAD" 2>/dev/null || true)
  if ((${#files[@]} == 0)); then
    apply_full_rebuild
    need_config_sync=1
  else
    for f in "${files[@]}"; do
      case "$f" in
        docker/Caddyfile)
          config_caddy=1
          need_config_sync=1
          ;;
        docker/Dockerfile.*|docker/docker-compose.prod.yml|docker/docker-compose.build.yml)
          apply_full_rebuild
          need_config_sync=1
          ;;
        scripts/remote-deploy.sh|scripts/detect-build-services.sh|scripts/package-config.sh|scripts/export-images.sh|scripts/deploy-bridge.ps1|.github/workflows/*)
          need_config_sync=1
          ;;
        apps/api/*|packages/database/*)
          need_api=1
          need_worker=1
          need_config_sync=1
          ;;
        workers/*)
          need_worker=1
          need_config_sync=1
          ;;
        apps/web/*|packages/ui/*)
          need_web=1
          need_config_sync=1
          ;;
        apps/admin/*)
          need_admin=1
          need_config_sync=1
          ;;
        packages/shared/*)
          apply_full_rebuild
          need_config_sync=1
          ;;
        packages/config/*|pnpm-lock.yaml|package.json|.npmrc)
          apply_full_rebuild
          need_config_sync=1
          ;;
        .github/*)
          ;;
        docs/*)
          ;;
        *)
          apply_full_rebuild
          need_config_sync=1
          ;;
      esac
    done
  fi
fi

services=()
[[ "$need_api" == 1 ]] && services+=("api")
[[ "$need_worker" == 1 ]] && services+=("worker")
[[ "$need_web" == 1 ]] && services+=("web")
[[ "$need_admin" == 1 ]] && services+=("admin")

# Caddyfile-only change: recreate caddy, skip image rebuild/pull.
if ((${#services[@]} == 0)) && [[ "$config_caddy" == 1 ]]; then
  config_only="caddy"
elif ((${#services[@]} == 0)); then
  config_only=""
else
  config_only=""
  [[ "$config_caddy" == 1 ]] && config_only="caddy"
fi

build_services="${services[*]}"

if [[ "$format" == "env" ]]; then
  echo "BUILD_SERVICES=\"${build_services}\""
  echo "CONFIG_ONLY=\"${config_only}\""
  echo "NEED_CONFIG_SYNC=\"${need_config_sync}\""
else
  echo "$build_services"
fi
