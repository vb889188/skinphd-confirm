#!/bin/sh
set -eu
STAMP=$(date +%Y%m%d-%H%M)
OUT="/opt/skinphd-confirm/backups"
mkdir -p "$OUT"
# Workspace JSON export is the operator copy. Database copy:
# From a machine with the Supabase access token:
#   supabase db dump --table confirm_clinics --table confirm_people --table confirm_templates --table confirm_agreements --table confirm_signatures --table confirm_signing_links --table confirm_audit --table confirm_source_files > "$OUT/confirm-$STAMP.sql"
echo "Write a dated JSON export from Settings → Export JSON to $OUT/confirm-$STAMP.json"
echo "Keep that file off the droplet as well as on it."
