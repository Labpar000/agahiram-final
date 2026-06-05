#!/bin/bash
set -e
docker exec agahiram-postgres psql -U agahiram -d agahiram -c "SELECT tablename FROM pg_tables WHERE schemaname='public' LIMIT 10;"
docker exec agahiram-postgres psql -U agahiram -d agahiram -c "SELECT migration_name FROM _prisma_migrations LIMIT 5;" 2>&1 || echo no_prisma_migrations_table
ls /opt/agahiram/packages/database/prisma/migrations 2>/dev/null | head -15
