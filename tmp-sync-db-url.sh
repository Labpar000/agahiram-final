#!/bin/bash
ENV=/opt/agahiram/docker/.env
PP=$(grep '^POSTGRES_PASSWORD=' "$ENV" | cut -d= -f2-)
PU=$(grep '^POSTGRES_USER=' "$ENV" | cut -d= -f2-)
PD=$(grep '^POSTGRES_DB=' "$ENV" | cut -d= -f2-)
CORRECT="postgresql://${PU}:${PP}@postgres:5432/${PD}?schema=public"
if grep -q '^DATABASE_URL=' "$ENV"; then
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=${CORRECT}|" "$ENV"
else
  echo "DATABASE_URL=${CORRECT}" >> "$ENV"
fi
echo database_url_synced
