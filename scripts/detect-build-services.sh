#!/bin/bash
# Decide which docker services to rebuild based on changed paths.
# Override anytime: BUILD_SERVICES="web" bash scripts/remote-deploy.sh
set -euo pipefail

if [[ -n "${BUILD_SERVICES:-}" ]]; then
  echo "$BUILD_SERVICES"
  exit 0
fi

BASE="${1:-HEAD~1}"
HEAD="${2:-HEAD}"

if ! git rev-parse "$BASE" >/dev/null 2>&1; then
  echo "api worker web admin"
  exit 0
fi

mapfile -t files < <(git diff --name-only "$BASE" "$HEAD" 2>/dev/null || true)
if ((${#files[@]} == 0)); then
  echo "api worker web admin"
  exit 0
fi

need_api=0 need_worker=0 need_web=0 need_admin=0

for f in "${files[@]}"; do
  case "$f" in
    apps/api/*|packages/database/*)
      need_api=1
      need_worker=1
      ;;
    workers/*)
      need_worker=1
      ;;
    apps/web/*|packages/ui/*)
      need_web=1
      ;;
    apps/admin/*)
      need_admin=1
      ;;
    packages/shared/*)
      need_api=1
      need_worker=1
      need_web=1
      need_admin=1
      ;;
    packages/config/*|docker/*|pnpm-lock.yaml|package.json|.npmrc|scripts/remote-deploy.sh)
      need_api=1
      need_worker=1
      need_web=1
      need_admin=1
      ;;
    .github/*)
      # CI/deploy-only edits should not force a full rebuild.
      ;;
    *)
      need_api=1
      need_worker=1
      need_web=1
      need_admin=1
      ;;
  esac
done

services=()
[[ "$need_api" == 1 ]] && services+=("api")
[[ "$need_worker" == 1 ]] && services+=("worker")
[[ "$need_web" == 1 ]] && services+=("web")
[[ "$need_admin" == 1 ]] && services+=("admin")

if ((${#services[@]} == 0)); then
  echo "web"
else
  echo "${services[*]}"
fi
