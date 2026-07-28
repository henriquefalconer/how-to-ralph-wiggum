#!/bin/bash
# Phase 3: QA evaluation using a fresh Claude agent as independent evaluator
# Runs Playwright regression first (fast), then Claude in Chrome for visual/interaction QA
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET_URL="${1:-}"
ITERATIONS="${2:-999}"

MAX_FAILURES="${RALPH_MAX_FAILURES:-3}"   # abort after N consecutive no-promise iterations

PROGRESS_DIR="ralph-to-ralph/.state/progress/qa"
LOG_DIR="ralph-to-ralph/.state/logs/qa"

if [ ! -f "prd.json" ]; then
  echo "Error: prd.json not found. Run ralph-build.sh first."
  exit 1
fi

echo "=== RALPH-TO-RALPH: Phase 3 (QA with Claude) ==="
echo "Target: ${TARGET_URL:-none}"
echo "Iterations: $ITERATIONS"
echo ""

mkdir -p "$PROGRESS_DIR" "$LOG_DIR"
if [ ! -f "report-qa.json" ]; then
  echo '[]' > report-qa.json
fi

# Start dev server in background
npm run dev &
DEV_PID=$!
echo "Dev server started (PID: $DEV_PID)"
# `|| true` because under `set -e` a failed kill (dev server already gone) would
# abort the trap and make the phase exit non-zero even on a successful QA_COMPLETE.
trap 'kill $DEV_PID 2>/dev/null || true' EXIT
sleep 5  # Wait for server to be ready

# Run Playwright regression suite first (fast, catches obvious bugs)
if [ -f "playwright.config.ts" ] || [ -d "tests/e2e" ]; then
  echo "--- Running Playwright regression suite ---"
  npx playwright test --reporter=list 2>&1 || echo "Some Playwright tests failed — QA agent will investigate."
  echo ""
fi

# The browser is driven with claude-in-chrome from inside the agent's turn — the
# agent opens http://localhost:3015 itself in the Chrome window that is already open.

# Build target URL context for the prompt
TARGET_CONTEXT=""
if [ -n "$TARGET_URL" ]; then
  TARGET_CONTEXT="
TARGET_URL: $TARGET_URL
When confused about how a feature should work, open $TARGET_URL with claude-in-chrome to check the original product."
fi

consecutive_failures=0

for ((i=1; i<=$ITERATIONS; i++)); do
  echo "--- QA iteration $i/$ITERATIONS ---"

  # One journal file per iteration, and only the five most recent are fed back
  # in. Older ones stay on disk under .state/, so the journal cannot grow into the
  # fresh context each iteration exists to protect.
  PROGRESS_FILE="$PROGRESS_DIR/$(printf '%03d' "$i").md"
  # `|| true` because an empty dir makes ls exit non-zero, which pipefail would
  # otherwise turn into a fatal error on the very first iteration.
  PROGRESS_REFS=$(ls "$PROGRESS_DIR"/*.md 2>/dev/null | tail -5 | sed 's|^|@|' | tr '\n' ' ') || true

  # Use a fresh Claude agent as an independent evaluator (clean context, skeptical prompt).
  # tee streams the agent's output live and keeps a transcript to grep for the
  # promise; rc is captured so a crash doesn't trip `set -e` before the retry logic.
  LOG="$LOG_DIR/$(printf '%03d' "$i").log"
  rc=0
  timeout 1200 claude -p --dangerously-skip-permissions --chrome --model claude-opus-4-8 \
"@ralph-to-ralph/prompt-qa.md @pre-setup.md @spec-build.md @prd.json @report-qa.json @claude-in-chrome-reference.md $PROGRESS_REFS

ITERATION: $i of $ITERATIONS
PROGRESS_FILE: $PROGRESS_FILE
CLONE_URL: http://localhost:3015
${TARGET_CONTEXT}

Test exactly ONE feature, then commit, push, and stop.
Write this iteration's notes to $PROGRESS_FILE — that file is yours alone. Never
append to an earlier iteration's file; the loop only feeds back the most recent few.
Output <promise>NEXT</promise> when done with this feature.
If ALL features have been QA tested and all bugs fixed, output <promise>QA_COMPLETE</promise>." \
    2>&1 | tee "$LOG" || rc=${PIPESTATUS[0]}

  if grep -qF "<promise>QA_COMPLETE</promise>" "$LOG"; then
    echo ""
    echo "--- Running final Playwright regression suite ---"
    npx playwright test --reporter=list 2>&1 || echo "Some Playwright tests failed in final regression."
    echo ""
    echo "=== QA complete after $i iterations! ==="
    exit 0
  fi

  if grep -qF "<promise>NEXT</promise>" "$LOG"; then
    consecutive_failures=0
    echo "QA for feature done. Moving to next..."
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
    echo "Check $LOG and report-qa.json."
    exit 1
  fi

  sleep $((3 * consecutive_failures))
done

# Run full E2E regression at the end
echo "--- Running final Playwright regression suite ---"
npx playwright test --reporter=list 2>&1 || echo "Some Playwright tests failed in final regression."
echo ""

echo ""
echo "=== QA finished after $ITERATIONS iterations ==="
echo "Check report-qa.json for results."
