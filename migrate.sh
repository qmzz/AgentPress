#!/bin/bash
# Run all pending migrations in order
# Usage: ./migrate.sh <database_url>

set -e

DATABASE_URL="${1:-$DATABASE_URL}"

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL not provided"
  echo "Usage: ./migrate.sh <database_url>"
  exit 1
fi

MIGRATIONS_DIR="$(dirname "$0")/migrations"

echo "Running migrations from $MIGRATIONS_DIR"

for migration in "$MIGRATIONS_DIR"/*.sql; do
  if [ -f "$migration" ]; then
    filename=$(basename "$migration")
    echo "Applying: $filename"
    psql "$DATABASE_URL" -f "$migration"
  fi
done

echo "All migrations completed successfully"
