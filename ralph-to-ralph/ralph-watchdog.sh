#!/bin/bash
# ralph-watchdog.sh - Runs loops in foreground with restart logic
#
# Flow:
#   1. Run inspect loop → restart if it stops before completing
#   2. Run build loop → restart if it stops before all passed
#   3. Run QA loop → if bugs found, restart build then QA
#
# Usage: ./ralph-to-ralph/ralph-watchdog.sh <target-url> [inspect-iters] [build-iters] [qa-iters]
#
# The iteration budgets are per attempt: a restarted phase gets a fresh budget.

set -euo pipefail
cd "$(dirname "$0")/.."

TARGET_URL="${1:?Usage: $0 <target-url> [inspect-iters] [build-iters] [qa-iters]}"
INSPECT_ITERS="${2:-999}"
BUILD_ITERS="${3:-999}"
QA_ITERS="${4:-999}"
STATE_DIR="ralph-to-ralph/.state"
LOCKFILE="$STATE_DIR/watchdog.lock"

mkdir -p "$STATE_DIR/logs/watchdog"
LOG_FILE="$STATE_DIR/logs/watchdog/$(date +%Y%m%d-%H%M%S).log"

# The orchestrator's own lines belong in the run's single progress file too:
# it is the one place that shows the whole run, and phase transitions and
# restarts are exactly the context that makes a session's usage entry readable.
RALPH_RUN_ID="${RALPH_RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)}"
RUN_DIR="$STATE_DIR/runs/$RALPH_RUN_ID"
PROGRESS="${RALPH_PROGRESS:-$RUN_DIR/progress.txt}"
export RALPH_RUN_ID RALPH_PROGRESS="$PROGRESS"
mkdir -p "$RUN_DIR"
touch "$PROGRESS"

log() {
  echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"
  printf '\n[ralph-watchdog %s] %s\n' "$(date -u +%H:%M:%S)" "$1" >> "$PROGRESS"
}

# Lock file
if [ -f "$LOCKFILE" ]; then
  PID=$(cat "$LOCKFILE" 2>/dev/null)
  if kill -0 "$PID" 2>/dev/null; then
    echo "Watchdog already running (PID $PID)."
    exit 0
  fi
  rm -f "$LOCKFILE"
fi
echo $$ > "$LOCKFILE"
trap 'rm -f "$LOCKFILE"' EXIT

# ─── Helpers ───

# prd.json drives every decision below, so a corrupt file must not read as "0
# features". It used to: json.load raised, `|| echo 0` swallowed it, and the
# watchdog spent all 10 build restarts across all 5 cycles on an unusable file
# before reporting COMPLETE. A *missing* file is still legitimately 0/0 — inspect
# has not written it yet — but an unparseable one is fatal.
read_prd() {   # prints "<passed> <total>"; non-zero exit if prd.json is corrupt
  python3 -c "
import json, os, sys
if not os.path.exists('prd.json'):
    print(0, 0); sys.exit(0)
try:
    d = json.load(open('prd.json'))
except Exception as e:
    print('cannot parse prd.json: %s' % e, file=sys.stderr); sys.exit(1)
if not isinstance(d, list):
    print('prd.json is not a JSON list', file=sys.stderr); sys.exit(1)
print(sum(1 for x in d if isinstance(x, dict) and x.get('passes', False)), len(d))
"
}

require_prd() {
  local err
  if ! err=$(read_prd 2>&1 >/dev/null); then
    log "FATAL: $err"
    log "Fix or delete prd.json and re-run — refusing to spend agent iterations on it."
    exit 1
  fi
}

# Empty is not corrupt, so require_prd passes it — but it is just as unusable
# once inspect claims to be done, and it fails `all_passed` (which requires
# total > 0) exactly like a PRD full of unbuilt features. That combination is
# what turns an empty list into 10 build restarts × 5 cycles against a file with
# nothing in it.
require_features() {
  if [ "$(total_tasks)" -eq 0 ]; then
    log "FATAL: inspect completed but prd.json lists no features."
    log "Nothing to build or verify. Delete $STATE_DIR/inspect-complete to re-inspect,"
    log "and check ralph-to-ralph/.state/logs/inspect/ for what Phase 1 actually did."
    exit 1
  fi
}

count_passes() { local s; s=$(read_prd 2>/dev/null) || s="0 0"; echo "${s%% *}"; }
total_tasks()  { local s; s=$(read_prd 2>/dev/null) || s="0 0"; echo "${s##* }"; }

all_passed() {
  local total=$(total_tasks)
  local passed=$(count_passes)
  [ "$total" -gt 0 ] && [ "$passed" -ge "$total" ]
}

# The sentinel records the URL it was written for, because nothing ever clears
# it. Keyed only by existence, a second run against a different product would
# skip Phase 1 and build the previous target's prd.json; keyed by URL, the same
# target still resumes without re-inspecting.
inspect_done() {
  [ -f "$STATE_DIR/inspect-complete" ] &&
    [ "$(cat "$STATE_DIR/inspect-complete" 2>/dev/null)" = "$TARGET_URL" ]
}

# QA's verdict is delivered by *editing* prd.json — a failed feature gets
# passes:false. So "QA approved everything" and "QA died before testing
# anything" produce byte-identical state: an unchanged prd.json. Inferring
# success from the absence of a rejection let a QA process that crashed in under
# a second be reported as "PASSED + QA VERIFIED". ralph-qa.sh clears this
# sentinel on entry and writes it only on QA_COMPLETE, so it is positive proof
# that a full pass ran rather than the absence of a complaint.
qa_verified() { [ -f "$STATE_DIR/qa-complete" ]; }

cron_backup() {
  git add -A 2>/dev/null || true
  git commit -m "watchdog backup $(date '+%H:%M') — $(count_passes)/$(total_tasks) passes" 2>/dev/null || true
  git push 2>/dev/null || true
}

# ─── PHASE 1: Inspect ───

START_TIME=$(date +%s)
log "=== Ralph-to-Ralph Watchdog Started ==="
log "Start time: $(date '+%Y-%m-%d %H:%M:%S')"
log "Target: $TARGET_URL"

MAX_INSPECT_RESTARTS=5
inspect_restarts=0

while ! inspect_done; do
  if [ "$inspect_restarts" -ge "$MAX_INSPECT_RESTARTS" ]; then
    log "Phase 1: Hit max restarts ($MAX_INSPECT_RESTARTS). Aborting."
    exit 1
  fi

  log "Phase 1: Running inspect loop... (attempt $((inspect_restarts + 1)))"
  ./ralph-to-ralph/ralph-inspect.sh "$TARGET_URL" "$INSPECT_ITERS" || true
  cron_backup

  if inspect_done; then
    log "Phase 1: Complete! $(total_tasks) features found."
    break
  else
    inspect_restarts=$((inspect_restarts + 1))
    log "Phase 1: Inspect stopped but not complete. Restarting..."
    sleep 5
  fi
done

# ─── PHASE 2 + 3: Build → QA → Fix loop ───

require_prd       # inspect wrote it; refuse to enter the cycles on an unusable file
require_features

MAX_CYCLES=5
MAX_QA_FAILURES=3
qa_failures=0

for ((cycle=1; cycle<=MAX_CYCLES; cycle++)); do
  log ""
  log "===== CYCLE $cycle/$MAX_CYCLES ====="

  # ─── PHASE 2: Build ───
  MAX_BUILD_RESTARTS=10
  build_restarts=0

  while ! all_passed; do
    # A corrupt or emptied prd.json also reads as "not all passed" — catch both
    # here, since the agent rewrites the file every iteration.
    require_prd
    require_features

    if [ "$build_restarts" -ge "$MAX_BUILD_RESTARTS" ]; then
      log "Phase 2: Hit max restarts ($MAX_BUILD_RESTARTS). Moving to QA."
      break
    fi

    log "Phase 2: Building... $(count_passes)/$(total_tasks) passes (attempt $((build_restarts + 1)))"
    ./ralph-to-ralph/ralph-build.sh "$BUILD_ITERS" || true
    cron_backup

    if all_passed; then
      log "Phase 2: All $(total_tasks) features pass!"
      break
    fi

    build_restarts=$((build_restarts + 1))
    REMAINING=$(($(total_tasks) - $(count_passes)))
    log "Phase 2: Build stopped with $REMAINING remaining. Restarting..."
    sleep 5
  done

  # ─── PHASE 3: QA ───
  log "Phase 3: Starting QA..."
  qa_rc=0
  ./ralph-to-ralph/ralph-qa.sh "$TARGET_URL" "$QA_ITERS" || qa_rc=$?
  cron_backup

  if ! qa_verified; then
    qa_failures=$((qa_failures + 1))
    case "$qa_rc" in
      0) why="exited cleanly without reaching QA_COMPLETE" ;;
      *) why="exited $qa_rc" ;;
    esac
    log "Phase 3: QA $why — no full pass ran ($qa_failures/$MAX_QA_FAILURES)."
    log "         prd.json is unchanged because QA did not finish, not because it approved."

    if [ "$qa_failures" -ge "$MAX_QA_FAILURES" ]; then
      log "FATAL: QA failed to complete $MAX_QA_FAILURES times running."
      log "Refusing to report a verified build. Check $STATE_DIR/logs/qa/ — the"
      log "features may well build, but nothing has verified that they work."
      exit 1
    fi

    sleep 5
    continue   # retry QA; build is re-entered first and no-ops if everything passes
  fi

  qa_failures=0
  AFTER_QA=$(count_passes)

  if all_passed; then
    log "=== ALL $(total_tasks) FEATURES: PASSED + QA VERIFIED ==="
    break
  fi

  REMAINING=$(($(total_tasks) - AFTER_QA))
  log "Phase 3: Cycle $cycle done. Passes: $AFTER_QA/$(total_tasks). $REMAINING remaining — restarting build..."
done

cron_backup
END_TIME=$(date +%s)
ELAPSED=$(( END_TIME - START_TIME ))
HOURS=$(( ELAPSED / 3600 ))
MINUTES=$(( (ELAPSED % 3600) / 60 ))
SECONDS_LEFT=$(( ELAPSED % 60 ))
log ""
log "========================================="
log "  RALPH-TO-RALPH COMPLETE"
log "  Features: $(count_passes)/$(total_tasks) passed"
if qa_verified; then
  log "  QA: full pass completed ($(cat "$STATE_DIR/qa-complete" 2>/dev/null))"
else
  log "  QA: NO full pass completed — the passes above are the build agent's"
  log "      own claim and nothing has independently verified them."
fi
log "  QA Report: report-qa.json"
log "  End time: $(date '+%Y-%m-%d %H:%M:%S')"
log "  Duration: ${HOURS}h ${MINUTES}m ${SECONDS_LEFT}s"
log "========================================="
