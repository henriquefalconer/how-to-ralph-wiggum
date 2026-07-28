#!/bin/bash
# Render control script — deploy, logs, settings and status for the Render web service.
# Talks to the Render REST API (https://api.render.com/v1) using RENDER_API_KEY
# and RENDER_SERVICE_ID from ./.env. Read-only by default; only `deploy` writes.
set -euo pipefail
cd "$(dirname "$0")/.."

API="https://api.render.com/v1"

RESP="$(mktemp)"
trap 'rm -f "$RESP" "$RESP.err"' EXIT

usage() {
  cat <<'EOF'
=== Render Control ===

Usage: ./scripts/render.sh <command> [options]

Commands:
  deploy [--force]      Deploy only if the service is behind the local HEAD commit.
                        Prints the new deploy id. --force always triggers a deploy.
  logs [DEPLOY_ID]      Print build + deploy logs for the most recent deploy,
                        or for DEPLOY_ID if given. --all drops the build/deploy
                        filter and shows every log line in the window.
  settings              Print the service configuration (name, type, repo, branch,
                        region, plan, auto-deploy, URL, env vars).
  status                One-line summary: latest deploy id, status, commit, time.
  help                  Show this message.

Options:
  --force               deploy: trigger even when already up to date.
  --all                 logs: do not filter by log type.
  --show-values         settings: print env var values instead of masking them.

Credentials are read from ./.env:
  RENDER_API_KEY        Render API key (Account Settings -> API Keys)
  RENDER_SERVICE_ID     Service id, e.g. srv-xxxxxxxxxxxxxxxxxxxx
EOF
}

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

# --- credentials -------------------------------------------------------------

load_env() {
  if [ ! -f .env ]; then
    fail ".env not found in the repo root.
  Create ./.env and add:
    RENDER_API_KEY=rnd_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
    RENDER_SERVICE_ID=srv-xxxxxxxxxxxxxxxxxxxx
  RENDER_API_KEY comes from Render -> Account Settings -> API Keys.
  RENDER_SERVICE_ID is the srv-... id in the service's dashboard URL."
  fi

  set -a
  # shellcheck disable=SC1091
  source .env
  set +a

  local missing=()
  [ -n "${RENDER_API_KEY:-}" ] || missing+=("RENDER_API_KEY")
  [ -n "${RENDER_SERVICE_ID:-}" ] || missing+=("RENDER_SERVICE_ID")

  if [ ${#missing[@]} -ne 0 ]; then
    fail "missing in ./.env: ${missing[*]}
  RENDER_API_KEY comes from Render -> Account Settings -> API Keys.
  RENDER_SERVICE_ID is the srv-... id in the service's dashboard URL.
  Add the line(s) above to ./.env, then re-run this command."
  fi
}

# --- HTTP --------------------------------------------------------------------

# api_get <path> [curl --data-urlencode args...] -> body in $RESP, echoes status
api_get() {
  local path="$1"
  shift
  local code
  if ! code=$(curl -sS -G -o "$RESP" -w '%{http_code}' \
    -H "Authorization: Bearer $RENDER_API_KEY" \
    -H "Accept: application/json" \
    "$@" "$API$path" 2>"$RESP.err"); then
    fail "could not reach the Render API at $API$path
  $(cat "$RESP.err" 2>/dev/null || true)"
  fi
  echo "$code"
}

# api_post <path> <json-body> -> body in $RESP, echoes status
api_post() {
  local path="$1"
  local body="$2"
  local code
  if ! code=$(curl -sS -X POST -o "$RESP" -w '%{http_code}' \
    -H "Authorization: Bearer $RENDER_API_KEY" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    -d "$body" \
    "$API$path" 2>"$RESP.err"); then
    fail "could not reach the Render API at $API$path
  $(cat "$RESP.err" 2>/dev/null || true)"
  fi
  echo "$code"
}

# check_http <status> <what> — turn a non-2xx into a readable message
check_http() {
  local code="$1"
  local what="$2"
  case "$code" in
  2*) return 0 ;;
  401 | 403)
    fail "Render rejected the credentials (HTTP $code) while $what.
  RENDER_API_KEY in ./.env is missing, expired or lacks access to this service.
  Regenerate it at Render -> Account Settings -> API Keys."
    ;;
  404)
    fail "Render returned 404 while $what.
  RENDER_SERVICE_ID='${RENDER_SERVICE_ID}' does not match a service this key can see.
  Copy the srv-... id from the service's dashboard URL into ./.env."
    ;;
  429)
    fail "rate limited by the Render API (HTTP 429) while $what. Wait a moment and retry."
    ;;
  *)
    fail "Render API returned HTTP $code while $what.
  $(api_error_message)"
    ;;
  esac
}

# Pull a human-readable message out of an error body without dumping raw JSON.
api_error_message() {
  python3 - "$RESP" <<'PY' 2>/dev/null || echo "(no further detail returned)"
import json, sys
try:
    with open(sys.argv[1]) as fh:
        body = fh.read().strip()
except OSError:
    sys.exit(1)
if not body:
    print("(empty response body)")
    sys.exit(0)
try:
    data = json.loads(body)
except ValueError:
    print(body[:300])
    sys.exit(0)
if isinstance(data, dict):
    print(data.get("message") or data.get("error") or json.dumps(data)[:300])
else:
    print(json.dumps(data)[:300])
PY
}

# --- data helpers ------------------------------------------------------------

# Fetch the service object into $RESP.
fetch_service() {
  local code
  code=$(api_get "/services/$RENDER_SERVICE_ID")
  check_http "$code" "fetching the service"
}

# Echo "id|status|commit|createdAt|finishedAt" for the most recent deploy,
# or for the deploy id in $1 when given.
fetch_latest_deploy() {
  local deploy_id="${1:-}"
  local code
  if [ -n "$deploy_id" ]; then
    code=$(api_get "/services/$RENDER_SERVICE_ID/deploys/$deploy_id")
    check_http "$code" "fetching deploy $deploy_id"
  else
    code=$(api_get "/services/$RENDER_SERVICE_ID/deploys" --data-urlencode "limit=1")
    check_http "$code" "listing deploys"
  fi

  python3 - "$RESP" <<'PY'
import json, sys
with open(sys.argv[1]) as fh:
    data = json.load(fh)
# List responses are [{"deploy": {...}, "cursor": "..."}]; a single fetch is the object itself.
if isinstance(data, list):
    if not data:
        print("NONE")
        sys.exit(0)
    d = data[0].get("deploy", data[0])
else:
    d = data.get("deploy", data)
commit = (d.get("commit") or {}).get("id") or ""
print("|".join([
    d.get("id") or "",
    d.get("status") or "",
    commit,
    d.get("createdAt") or "",
    d.get("finishedAt") or "",
]))
PY
}

# --- commands ----------------------------------------------------------------

cmd_status() {
  load_env
  local row
  row=$(fetch_latest_deploy "${1:-}")
  if [ "$row" = "NONE" ]; then
    echo "=== Render Status ==="
    echo "  no deploys yet for $RENDER_SERVICE_ID"
    return 0
  fi

  local id status commit created
  IFS='|' read -r id status commit created _ <<<"$row"

  echo "=== Render Status ==="
  echo "  Service    $RENDER_SERVICE_ID"
  echo "  Deploy     $id"
  echo "  Status     $status"
  echo "  Commit     ${commit:0:12}"
  echo "  Created    $created"
}

cmd_deploy() {
  local force="${1:-}"
  load_env

  local head
  head=$(git rev-parse HEAD 2>/dev/null) || fail "not a git repository — cannot determine the local HEAD commit."

  echo "=== Render Deploy ==="
  echo "  Local HEAD   ${head:0:12}"

  if [ "$force" != "--force" ]; then
    local row
    row=$(fetch_latest_deploy)
    if [ "$row" != "NONE" ]; then
      local id status commit
      IFS='|' read -r id status commit _ _ <<<"$row"
      echo "  Last deploy  ${commit:0:12} ($status)"
      if [ "$commit" = "$head" ] && [ "$status" = "live" ]; then
        echo ""
        echo "  Service is already up to date — nothing to deploy."
        echo "  Use --force to deploy anyway."
        return 0
      fi
    else
      echo "  Last deploy  (none)"
    fi
  else
    echo "  Mode         --force"
  fi

  local code
  code=$(api_post "/services/$RENDER_SERVICE_ID/deploys" '{}')
  check_http "$code" "triggering a deploy"

  local new_id
  new_id=$(python3 - "$RESP" <<'PY'
import json, sys
with open(sys.argv[1]) as fh:
    d = json.load(fh)
d = d.get("deploy", d) if isinstance(d, dict) else d
print(d.get("id", "(unknown)"))
PY
  )

  echo ""
  echo "  Triggered    $new_id"
  echo ""
  echo "  Follow it with: ./scripts/render.sh logs $new_id"
}

cmd_logs() {
  local deploy_id=""
  local filter_types=1
  local arg
  for arg in "$@"; do
    case "$arg" in
    --all) filter_types=0 ;;
    -*) fail "unknown option for logs: $arg" ;;
    *) deploy_id="$arg" ;;
    esac
  done

  load_env

  # The logs endpoint is workspace-scoped and needs an ownerId, which is not
  # something we can know ahead of time — read it off the service object.
  fetch_service
  local owner_id
  owner_id=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("ownerId",""))' "$RESP")
  [ -n "$owner_id" ] || fail "could not determine the workspace ownerId from the service object."

  local row
  row=$(fetch_latest_deploy "$deploy_id")
  [ "$row" != "NONE" ] && [ -n "$row" ] || fail "no deploys found for $RENDER_SERVICE_ID."

  local id status commit created finished
  IFS='|' read -r id status commit created finished <<<"$row"

  # An in-progress deploy has no finishedAt yet — read up to now.
  local end_time="$finished"
  if [ -z "$end_time" ]; then
    end_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  fi

  echo "=== Render Logs ==="
  echo "  Deploy   $id ($status)"
  echo "  Commit   ${commit:0:12}"
  echo "  Window   $created -> $end_time"
  echo ""

  local start="$created"
  local page=0
  local printed=0
  while [ "$page" -lt 50 ]; do
    local args=(
      --data-urlencode "ownerId=$owner_id"
      --data-urlencode "resource=$RENDER_SERVICE_ID"
      --data-urlencode "startTime=$start"
      --data-urlencode "endTime=$end_time"
      --data-urlencode "direction=forward"
      --data-urlencode "limit=100"
    )
    if [ "$filter_types" -eq 1 ]; then
      args+=(--data-urlencode "type=build" --data-urlencode "type=deploy")
    fi

    local code
    code=$(api_get "/logs" "${args[@]}")
    check_http "$code" "fetching logs"

    # Print this page's lines, then recompute paging state from the same body.
    python3 - "$RESP" <<'PY'
import json, sys
with open(sys.argv[1]) as fh:
    data = json.load(fh)
for entry in data.get("logs") or []:
    labels = {l.get("name"): l.get("value") for l in (entry.get("labels") or [])}
    level = (labels.get("level") or "info").upper()
    ts = (entry.get("timestamp") or "")[11:19]
    message = (entry.get("message") or "").rstrip("\n")
    for i, line in enumerate(message.split("\n")):
        print(f"  {ts if i == 0 else '        ':<8}  {level:<5}  {line}")
PY

    local more next_start n
    more=$(python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print("1" if d.get("hasMore") else "0")' "$RESP")
    next_start=$(python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print(d.get("nextStartTime") or "")' "$RESP")
    n=$(python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print(len(d.get("logs") or []))' "$RESP")
    if [ "$n" -gt 0 ]; then printed=1; fi

    [ "$more" = "1" ] || break
    [ -n "$next_start" ] || break
    [ "$next_start" != "$start" ] || break
    start="$next_start"
    page=$((page + 1))
  done

  [ "$printed" -eq 1 ] || echo "  (no log lines in this window)"
}

cmd_settings() {
  local show_values=0
  [ "${1:-}" = "--show-values" ] && show_values=1

  load_env
  fetch_service

  python3 - "$RESP" <<'PY'
import json, sys
with open(sys.argv[1]) as fh:
    s = json.load(fh)
d = s.get("serviceDetails") or {}
rows = [
    ("Name", s.get("name")),
    ("Service ID", s.get("id")),
    ("Type", s.get("type")),
    ("Runtime", d.get("runtime") or d.get("env")),
    ("Repo", s.get("repo")),
    ("Branch", s.get("branch")),
    ("Root dir", s.get("rootDir") or "(repo root)"),
    ("Region", d.get("region")),
    ("Plan", d.get("plan")),
    ("Instances", d.get("numInstances")),
    ("Auto-deploy", s.get("autoDeploy")),
    ("Auto-deploy trigger", s.get("autoDeployTrigger")),
    ("Suspended", s.get("suspended")),
    ("URL", d.get("url")),
    ("Dashboard", s.get("dashboardUrl")),
    ("Owner ID", s.get("ownerId")),
    ("Created", s.get("createdAt")),
]
print("--- Service ---")
for label, value in rows:
    if value not in (None, ""):
        print(f"  {label:<21} {value}")
PY

  # Env vars live on their own endpoint.
  local code
  code=$(api_get "/services/$RENDER_SERVICE_ID/env-vars" --data-urlencode "limit=100")
  if [ "$code" = "200" ]; then
    echo ""
    echo "--- Environment Variables ---"
    python3 - "$RESP" "$show_values" <<'PY'
import json, sys
with open(sys.argv[1]) as fh:
    data = json.load(fh)
show = sys.argv[2] == "1"
items = data if isinstance(data, list) else data.get("envVars", [])
if not items:
    print("  (none set on the service)")
for item in items:
    ev = item.get("envVar", item)
    key = ev.get("key", "?")
    value = ev.get("value")
    if value is None:
        shown = "(from secret file / linked resource)"
    elif show:
        shown = value
    else:
        shown = f"{value[:2]}***" if len(value) > 4 else "***"
    print(f"  {key:<28} {shown}")
if not show:
    print("")
    print("  Values are masked. Re-run with --show-values to print them.")
PY
  else
    echo ""
    echo "--- Environment Variables ---"
    echo "  (not readable with this API key — HTTP $code)"
  fi
}

# --- entrypoint --------------------------------------------------------------

main() {
  local cmd="${1:-help}"
  shift || true

  case "$cmd" in
  deploy) cmd_deploy "${1:-}" ;;
  logs) cmd_logs "$@" ;;
  settings) cmd_settings "${1:-}" ;;
  status) cmd_status ;;
  help | -h | --help | "") usage ;;
  *)
    echo "Unknown command: $cmd" >&2
    echo "" >&2
    usage >&2
    exit 1
    ;;
  esac
}

main "$@"
