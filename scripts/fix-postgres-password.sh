#!/usr/bin/env bash
set -euo pipefail
ENV_FILE="${1:-/opt/agahiram/docker/.env}"
NEW_PASS=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)
docker exec agahiram-postgres psql -U agahiram -d agahiram -c "ALTER USER agahiram PASSWORD '${NEW_PASS}';"
sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${NEW_PASS}|" "$ENV_FILE"
sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://agahiram:${NEW_PASS}@postgres:5432/agahiram?schema=public|" "$ENV_FILE"
docker run --rm --network docker_agahiram -e PGPASSWORD="$NEW_PASS" postgres:16-alpine \
  psql -h agahiram-postgres -U agahiram -d agahiram -c 'select 1' >/dev/null
echo "postgres-password-synced"
