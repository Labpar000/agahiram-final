#!/bin/bash
set -euo pipefail
docker exec agahiram-postgres psql -U agahiram -d agahiram -c "SELECT schemaname, tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY 1,2;"
docker exec agahiram-postgres psql -U agahiram -d agahiram -c "SELECT extname FROM pg_extension;" 2>&1
