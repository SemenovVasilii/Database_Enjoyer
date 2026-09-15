#!/usr/bin/env bash
set -Eeuo pipefail

cd /opt/database-enjoyer

if [[ ! -f .env.production ]]; then
  echo 'Missing /opt/database-enjoyer/.env.production' >&2
  exit 1
fi

compose=(docker compose --env-file .env.production -f compose.prod.yaml)

"${compose[@]}" config --quiet
"${compose[@]}" up -d --build --remove-orphans --wait --wait-timeout 300
"${compose[@]}" ps
