#!/bin/bash
# Pre-flight: validate that every backing service is wired up BEFORE the build loop starts
# Run this once before ./ralph-watchdog.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "=== Pre-flight Environment Check ==="

MISSING=()

check_var() {
  local name="$1"
  local label="$2"
  local value="${!name:-}"
  if [ -n "$value" ]; then
    echo "  OK       $name — $label"
  else
    echo "  MISSING  $name — $label"
    MISSING+=("$name")
  fi
}

# 0. .env — the single source of truth for the clone's credentials
echo ""
echo "--- .env ---"
if [ -f .env ]; then
  echo "  OK       .env found"
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
else
  echo "  MISSING  .env — create it in the project root"
  MISSING+=(".env")
fi

# 1. Neon Postgres
echo ""
echo "--- Neon Postgres ---"
check_var DATABASE_URL "Neon connection string (Neon dashboard -> Connection Details)"

# 2. Cloudflare R2
echo ""
echo "--- Cloudflare R2 ---"
check_var R2_ACCOUNT_ID "Cloudflare account ID — endpoint is https://<id>.r2.cloudflarestorage.com"
check_var R2_ACCESS_KEY_ID "R2 API token access key ID"
check_var R2_SECRET_ACCESS_KEY "R2 API token secret access key"
check_var R2_BUCKET "R2 bucket name"

# 3. Auth wall
echo ""
echo "--- Auth Wall ---"
check_var DASHBOARD_KEY "master key that unlocks the dashboard and the API"

# 4. Summary
echo ""
if [ ${#MISSING[@]} -eq 0 ]; then
  echo "=== Pre-flight Complete — all checks passed ==="
  echo ""
  echo "Next: ./ralph-watchdog.sh <target-url>"
else
  echo "=== Pre-flight FAILED — ${#MISSING[@]} item(s) missing ==="
  for item in "${MISSING[@]}"; do
    echo "  - $item"
  done
  echo ""
  echo "Neon, R2 and Render are each created from their own web dashboard."
  echo "Set them up there, put the values in ./.env, then re-run this script."
  exit 1
fi
