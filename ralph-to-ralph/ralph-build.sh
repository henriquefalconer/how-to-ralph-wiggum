#!/bin/bash
# Phase 2: Build a clone from the generated PRD and build spec
# Each iteration = exactly 1 feature (enforced by prompt + NEXT/COMPLETE promises)
set -euo pipefail
cd "$(dirname "$0")/.."

ITERATIONS="${1:-999}"

MAX_FAILURES="${RALPH_MAX_FAILURES:-3}"   # abort after N consecutive no-promise iterations

PROGRESS_DIR="ralph-to-ralph/.state/progress/build"
LOG_DIR="ralph-to-ralph/.state/logs/build"

if [ ! -f "prd.json" ]; then
  echo "Error: prd.json not found. Run ralph-inspect.sh first."
  exit 1
fi

if [ ! -f "spec-build.md" ]; then
  echo "Error: spec-build.md not found. Run ralph-inspect.sh first."
  exit 1
fi

echo "=== RALPH-TO-RALPH: Phase 2 (Build) ==="
echo "Iterations: $ITERATIONS"
echo ""

mkdir -p "$PROGRESS_DIR" "$LOG_DIR"

# A corrupt prd.json must not read as "0 features" — that looks identical to an
# empty PRD and burns every remaining iteration on a file no agent can use. The
# agent rewrites prd.json each iteration, so this is re-checked every time round.
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
    echo "Error: $err"
    echo "Fix or delete prd.json and re-run — refusing to spend iterations on it."
    exit 1
  fi
}

count_passes() { local s; s=$(read_prd 2>/dev/null) || s="0 0"; echo "${s%% *}"; }
total_tasks()  { local s; s=$(read_prd 2>/dev/null) || s="0 0"; echo "${s##* }"; }

consecutive_failures=0

for ((i=1; i<=$ITERATIONS; i++)); do
  require_prd
  PASSES=$(count_passes)
  TOTAL=$(total_tasks)
  echo "--- Build iteration $i/$ITERATIONS ($PASSES/$TOTAL passed) ---"

  # An empty feature list parses fine, so require_prd waves it through — but
  # there is nothing here to build. The "all done" test below deliberately
  # excludes 0/0, so without this the loop would invoke the agent against an
  # empty PRD every iteration, and the watchdog would restart it ten times per
  # cycle for five cycles. Re-checked each iteration because the agent rewrites
  # prd.json and could truncate it.
  if [ "$TOTAL" -eq 0 ]; then
    echo "Error: prd.json contains no features — there is nothing to build."
    echo "Inspect should have written the feature list. Check that Phase 1 actually"
    echo "produced one before spending iterations here."
    exit 1
  fi

  # Check if all done before invoking
  if [ "$PASSES" -ge "$TOTAL" ]; then
    echo "All $TOTAL features already pass!"
    exit 0
  fi

  # One journal file per iteration, and only the five most recent are fed back
  # in. Older ones stay on disk under .state/, so the journal cannot grow into the
  # fresh context each iteration exists to protect.
  PROGRESS_FILE="$PROGRESS_DIR/$(printf '%03d' "$i").md"
  # `|| true` because an empty dir makes ls exit non-zero, which pipefail would
  # otherwise turn into a fatal error on the very first iteration.
  PROGRESS_REFS=$(ls "$PROGRESS_DIR"/*.md 2>/dev/null | tail -5 | sed 's|^|@|' | tr '\n' ' ') || true

  # tee streams the agent's output live and keeps a transcript to grep for the
  # promise; rc is captured so a crash doesn't trip `set -e` before the retry logic.
  LOG="$LOG_DIR/$(printf '%03d' "$i").log"
  rc=0
  timeout 1200 claude -p --dangerously-skip-permissions --chrome --model claude-sonnet-5 \
"@ralph-to-ralph/prompt-build.md @pre-setup.md @spec-build.md @prd.json @CLAUDE.md $PROGRESS_REFS

ITERATION: $i of $ITERATIONS
PROGRESS: $PASSES/$TOTAL features passed
PROGRESS_FILE: $PROGRESS_FILE

Build exactly ONE feature (the first passes:false entry), then commit, push, and stop.
Write this iteration's notes to $PROGRESS_FILE — that file is yours alone. Never
append to an earlier iteration's file; the loop only feeds back the most recent few.
Output <promise>NEXT</promise> when done with this feature.
Output <promise>COMPLETE</promise> only if ALL features pass." \
    2>&1 | tee "$LOG" || rc=${PIPESTATUS[0]}

  if grep -qF "<promise>COMPLETE</promise>" "$LOG"; then
    echo ""
    echo "=== Build complete after $i iterations! All $(total_tasks) features pass. ==="
    exit 0
  fi

  if grep -qF "<promise>NEXT</promise>" "$LOG"; then
    consecutive_failures=0
    echo "Feature done. Moving to next iteration..."
    continue
  fi

  # No promise = crash, timeout, or an agent that stopped early
  case "$rc" in
    0)   reason="claude exited cleanly but emitted no promise — the agent stopped early" ;;
    124) reason="claude hit the 1200s timeout" ;;
    127) reason="claude not found on PATH" ;;
    *)   reason="claude exited $rc" ;;
  esac

  consecutive_failures=$((consecutive_failures + 1))
  echo "WARNING: no promise ($consecutive_failures/$MAX_FAILURES) — $reason. Transcript: $LOG"

  if [ "$consecutive_failures" -ge "$MAX_FAILURES" ]; then
    echo ""
    echo "=== Aborting: $MAX_FAILURES consecutive iterations produced no promise ==="
    echo "Passes: $(count_passes)/$(total_tasks). Check $LOG."
    exit 1
  fi

  sleep $((3 * consecutive_failures))
done

echo ""
echo "=== Build finished after $ITERATIONS iterations ==="
echo "Passes: $(count_passes)/$(total_tasks). Check prd.json for remaining."
