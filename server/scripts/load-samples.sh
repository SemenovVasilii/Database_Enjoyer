#!/bin/sh
# Run from any directory. Existing sample databases are preserved, not reset.
set -eu
cd "$(dirname "$0")/../.."
docker compose -f compose.samples.yaml exec -T test-postgres sh /docker-entrypoint-initdb.d/002-samples.sh
docker compose -f compose.samples.yaml exec -T test-mysql sh /docker-entrypoint-initdb.d/002-samples.sh
docker compose -f compose.samples.yaml exec -T test-mongo sh /docker-entrypoint-initdb.d/002-samples.sh
