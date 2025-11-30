#!/usr/bin/env bash
# Destructive re-initialization helper for MongoDB data directories.
# WARNING: This will move existing MongoDB data directories to *.bak and create empty dirs.
# Run this on the Docker host where your /docker/mongodb mounts live.

set -euo pipefail

DATA_DIR=${1:-/docker/mongodb/data}
CONFIGDB_DIR=${2:-/docker/mongodb/configdb}
COMPOSE_DIR=${3:-/docker-compose}

echo "This script will BACK UP and REINITIALIZE MongoDB data dirs." >&2
echo "Data dir: $DATA_DIR" >&2
echo "ConfigDB dir: $CONFIGDB_DIR" >&2
echo "Compose dir (for docker compose down/up): $COMPOSE_DIR" >&2

read -p "Proceed and move $DATA_DIR -> ${DATA_DIR}.bak ? [y/N] " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Aborted by user." >&2
  exit 1
fi

echo "Stopping compose stack from $COMPOSE_DIR..."
(cd "$COMPOSE_DIR" && docker compose down) || true

ts=$(date +%Y%m%d-%H%M%S)
mv "${DATA_DIR}" "${DATA_DIR}.bak.${ts}" || true
mv "${CONFIGDB_DIR}" "${CONFIGDB_DIR}.bak.${ts}" || true

echo "Recreating empty data directories..."
mkdir -p "${DATA_DIR}" "${CONFIGDB_DIR}"

# Typical MongoDB container user is uid 999 in official images; adjust if necessary.
if id -u 999 &>/dev/null; then
  chown -R 999:999 "${DATA_DIR}" "${CONFIGDB_DIR}" || true
else
  echo "UID 999 not found locally; skipping chown. Ensure directories are writable by Docker daemon." >&2
fi

echo "Starting compose stack..."
(cd "$COMPOSE_DIR" && docker compose up -d)

echo "Tailing MongoDB logs (press Ctrl-C to stop)..."
(cd "$COMPOSE_DIR" && docker compose logs -f mongodb)
