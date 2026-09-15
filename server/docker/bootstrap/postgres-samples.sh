#!/bin/sh
set -eu
export PGPASSWORD="${POSTGRES_PASSWORD}"
if [ "$(psql -U "$POSTGRES_USER" -d postgres -Atc "SELECT count(*) FROM pg_database WHERE datname='pagila'")" = 0 ]; then
  createdb -U "$POSTGRES_USER" pagila
  psql --single-transaction -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d pagila -f /samples/pagila/schema.sql -f /samples/pagila/data.sql
else
  echo 'pagila exists; keeping its data. Schema/data are not overwritten.'
fi
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d pagila -v sample_user="${SAMPLE_POSTGRES_USER:-enjoyer}" -v sample_password="${SAMPLE_POSTGRES_PASSWORD:-enjoyer_postgres}" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'sample_user', :'sample_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname=:'sample_user') \gexec
GRANT CONNECT ON DATABASE pagila TO :"sample_user";
GRANT USAGE ON SCHEMA public TO :"sample_user";
GRANT SELECT ON ALL TABLES IN SCHEMA public TO :"sample_user";
SQL
