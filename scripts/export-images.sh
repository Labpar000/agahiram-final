#!/usr/bin/env bash
# Pull built images from GHCR on a runner with internet, save as a single gzip tarball.
# Usage: export-images.sh <registry> <tag> <output.tar.gz> api web ...
set -euo pipefail

REGISTRY="${1:?registry}"
TAG="${2:?tag}"
OUTPUT="${3:?output path}"
shift 3
SERVICES=("$@")

if [[ ${#SERVICES[@]} -eq 0 ]]; then
  echo "no services to export" >&2
  exit 1
fi

IMAGES=()
for svc in "${SERVICES[@]}"; do
  ref="${REGISTRY}/${svc}:${TAG}"
  echo "[export-images] pulling $ref"
  docker pull "$ref"
  IMAGES+=("$ref")
done

echo "[export-images] saving ${#IMAGES[@]} images -> $OUTPUT"
docker save "${IMAGES[@]}" | gzip -1 > "$OUTPUT"
sha256sum "$OUTPUT" | awk '{print $1}'
