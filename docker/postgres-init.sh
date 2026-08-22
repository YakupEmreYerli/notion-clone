#!/bin/bash
# Creates the databases the stack expects:
#   - $AUTH_DATABASE_NAME   -> Better Auth (users, sessions, jwks)
#   - $CONVEX_INSTANCE_NAME -> the self-hosted Convex deployment
set -e

for db in "${AUTH_DATABASE_NAME:-zotion_auth}" "${CONVEX_INSTANCE_NAME:-zotion}"; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<-EOSQL
    SELECT 'CREATE DATABASE "${db}"'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${db}')\gexec
EOSQL
done
