#!/bin/bash
# پشتیبان‌گیری روزانه پایگاه داده آگهی‌گرام

set -e

BACKUP_DIR="${BACKUP_DIR:-/var/backups/agahiram}"
APP_DIR="${APP_DIR:-/opt/agahiram}"
DATE=$(date +%Y%m%d_%H%M%S)
KEEP_DAYS=14

mkdir -p "$BACKUP_DIR"

cd "$APP_DIR/docker"
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U agahiram agahiram | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +$KEEP_DAYS -delete

echo "[backup] saved $BACKUP_DIR/db_$DATE.sql.gz"
