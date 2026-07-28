#!/bin/bash
# Pre-flight: validate that every backing service is wired up BEFORE the build loop starts
# Run this once before ./ralph/ralph-to-ralph.sh
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
check_var NEON_API_KEY "Neon API key (Neon console -> Account settings -> API keys)"
check_var NEON_ORG_ID "Neon org id, org-... (the API key is org-scoped)"
check_var NEON_PROJECT_ID "Neon project id (its read_write endpoint must match NEON_DATABASE_URL)"

# 2. Auth wall
echo ""
echo "--- Auth Wall ---"
check_var DASHBOARD_KEY "master key that unlocks the dashboard and the API"

# 3. Render
echo ""
echo "--- Render ---"
check_var RENDER_API_KEY "Render API key (Render dashboard -> Account Settings -> API Keys)"
check_var RENDER_SERVICE_ID "Render service id, srv-... (from the service's dashboard URL)"

# 4. Neon usage — storage is the limit this workload approaches. Neon bills
# *synthetic* storage, which includes history retention and runs several times
# the logical database size under a build's write churn. Informational: a slow
# or unreachable API must not block a run.
if [ -n "${NEON_API_KEY:-}" ] && [ -n "${NEON_PROJECT_ID:-}" ]; then
  echo ""
  echo "--- Neon usage ---"
  curl -s --max-time 20 -H "Authorization: Bearer $NEON_API_KEY" \
    "https://console.neon.tech/api/v2/projects/$NEON_PROJECT_ID" 2>/dev/null |
    python3 -c "
import json, sys
p = (json.load(sys.stdin).get('project') or {})
if not p:
    print('  WARN     could not read project usage from the Neon API'); raise SystemExit
mb = (p.get('synthetic_storage_size') or 0) / 1e6
print(f\"  OK       {p.get('name')} — storage {mb:.1f} MB of 500 MB ({mb/500*100:.1f}%)\")
" 2>/dev/null || echo "  WARN     could not read project usage from the Neon API"
fi

# 5. Summary
echo ""
if [ ${#MISSING[@]} -eq 0 ]; then
  echo "=== Pre-flight Complete — all checks passed ==="
  echo ""
  echo "Next: ./ralph/ralph-to-ralph.sh <target-url>"
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
