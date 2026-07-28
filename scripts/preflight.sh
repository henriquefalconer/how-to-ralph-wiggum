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

# 4. Neon usage — only meaningful once the four Neon vars are present.
#
# Two things this catches that a "is the variable set" check cannot: ids that
# resolve but describe a DIFFERENT project than the app writes to (the endpoint
# comparison below), and a run started with storage already near the cap.
#
# Storage is the limit this workload approaches, not compute. Neon bills
# *synthetic* storage, which includes history retention and runs several times
# the logical database size under a build's write churn. The plan's "compute
# hours" are CU-hours: at the free tier's 0.25 CU, 191.9 CU-h is ~767 hours of
# activity a month, which a single run cannot exhaust.
if [ -n "${NEON_API_KEY:-}" ] && [ -n "${NEON_ORG_ID:-}" ] && [ -n "${NEON_PROJECT_ID:-}" ]; then
  echo ""
  echo "--- Neon usage ---"
  NEON_JSON=$(curl -s --max-time 20 \
    -H "Authorization: Bearer $NEON_API_KEY" -H "Accept: application/json" \
    "https://console.neon.tech/api/v2/projects/$NEON_PROJECT_ID" 2>/dev/null || true)
  NEON_EPS=$(curl -s --max-time 20 \
    -H "Authorization: Bearer $NEON_API_KEY" -H "Accept: application/json" \
    "https://console.neon.tech/api/v2/projects/$NEON_PROJECT_ID/endpoints" 2>/dev/null || true)
  if ! NEON_REPORT=$(NEON_JSON="$NEON_JSON" NEON_EPS="$NEON_EPS" \
      DB_URL="${NEON_DATABASE_URL:-}" ORG_ID="$NEON_ORG_ID" python3 - <<'PY'
import json, os, re, sys
try:
    proj = json.loads(os.environ["NEON_JSON"]).get("project") or {}
except Exception:
    print("  WARN     could not reach the Neon API (network or bad NEON_API_KEY)"); sys.exit(0)
if not proj:
    print("  FAIL     NEON_PROJECT_ID does not resolve with this NEON_API_KEY"); sys.exit(1)
print(f"  OK       project {proj.get('name')} ({proj.get('region_id')}, pg{proj.get('pg_version')})")
if proj.get("org_id") and proj["org_id"] != os.environ["ORG_ID"]:
    print(f"  FAIL     NEON_ORG_ID is {os.environ['ORG_ID']} but the project belongs to {proj['org_id']}")
    sys.exit(1)
# The ids must describe the database the app actually writes to.
host = ""
m = re.search(r"@([^/?:]+)", os.environ.get("DB_URL", ""))
if m:
    host = m.group(1)
    try:
        eps = json.loads(os.environ["NEON_EPS"]).get("endpoints", [])
    except Exception:
        eps = []
    rw = [e.get("host", "") for e in eps if e.get("type") == "read_write"]
    if rw and host not in rw:
        print(f"  FAIL     NEON_DATABASE_URL points at {host}, not this project's endpoint ({rw[0]})")
        sys.exit(1)
    if rw:
        print(f"  OK       NEON_DATABASE_URL matches the project's read_write endpoint")
storage = proj.get("synthetic_storage_size")
compute = proj.get("compute_time_seconds")
if storage is not None:
    pct = storage / 5e8 * 100          # 500 MB on the free plan
    flag = "WARN " if pct >= 80 else "OK   "
    print(f"  {flag}    storage {storage/1e6:.1f} MB of 500 MB ({pct:.1f}%) — synthetic, includes history retention")
if compute is not None:
    print(f"  OK       compute {compute/3600:.2f} CU-h of 191.9 ({compute/3600/191.9*100:.1f}%) — not the binding limit")
PY
  ); then
    echo "$NEON_REPORT"
    MISSING+=("Neon configuration is inconsistent — see above")
  else
    echo "$NEON_REPORT"
  fi
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
