#!/bin/sh
set -eu
cd /opt/skinphd-confirm
git fetch origin main
git reset --hard origin/main
docker compose up --build -d
curl -fsS -o /dev/null http://127.0.0.1:8080/
echo "Skin PhD Confirm updated"
