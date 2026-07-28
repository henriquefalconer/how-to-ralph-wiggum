#!/bin/bash
# Phase 2: Build a clone from the generated PRD and build spec
# Each iteration = exactly 1 feature (enforced by prompt + NEXT/COMPLETE promises)
set -euo pipefail
cd "$(dirname "$0")/.."

ITERATIONS="${1:-999}"

MAX_FAILURES="${RALPH_MAX_FAILURES:-3}"   # abort after N consecutive no-promise iterations

PROGRESS_DIR="ralph_to_ralph/.state/progress/build"
LOG_DIR="ralph_to_ralph/.state/logs/build"

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

count_passes() {
  python3 -c "import json; d=json.load(open('prd.json')); print(sum(1 for x in d if x.get('passes', False)))" 2>/dev/null || echo "0"
}
total_tasks() {
  python3 -c "import json; print(len(json.load(open('prd.json'))))" 2>/dev/null || echo "0"
}

consecutive_failures=0

for ((i=1; i<=$ITERATIONS; i++)); do
  PASSES=$(count_passes)
  TOTAL=$(total_tasks)
  echo "--- Build iteration $i/$ITERATIONS ($PASSES/$TOTAL passed) ---"

  # Check if all done before invoking
  if [ "$PASSES" -ge "$TOTAL" ] && [ "$TOTAL" -gt 0 ]; then
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
  timeout 1200 claude -p --dangerously-skip-permissions --chrome --model claude-opus-4-8 \
"@ralph_to_ralph/prompt-build.md @pre-setup.md @spec-build.md @prd.json @CLAUDE.md $PROGRESS_REFS

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
