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
check_var NEON_DATABASE_URL "Neon connection string (Neon dashboard -> Connection Details)"

# 2. Auth wall
echo ""
echo "--- Auth Wall ---"
check_var DASHBOARD_KEY "master key that unlocks the dashboard and the API"

# 3. Render
echo ""
echo "--- Render ---"
check_var RENDER_API_KEY "Render API key (Render dashboard -> Account Settings -> API Keys)"
check_var RENDER_SERVICE_ID "Render service id, srv-... (from the service's dashboard URL)"

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
  echo "Neon and Render are each created from their own web dashboard."
  echo "Set them up there, put the values in ./.env, then re-run this script."
  exit 1
fi
