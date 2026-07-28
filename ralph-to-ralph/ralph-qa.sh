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
STATE_DIR="ralph-to-ralph/.state"
QA_SENTINEL="$STATE_DIR/qa-complete"
DEV_PORT=3015

# The watchdog reads this file to tell "QA verified everything" apart from "QA
# died before verifying anything". Clear it before *any* other work, including
# the guards below: a sentinel left by an earlier cycle must never outlive the
# run it vouched for. Clearing it after the prd.json guard left one path —
# prd.json missing at QA time — on which this script exits 1 while last cycle's
# sentinel survives, and the watchdog then reads that as a full pass over a QA
# run that never started.
mkdir -p "$STATE_DIR"
rm -f "$QA_SENTINEL"

if [ ! -f "prd.json" ]; then
  echo "Error: prd.json not found. Run ralph-build.sh first."
  exit 1
fi

echo "=== RALPH-TO-RALPH: Phase 3 (QA with Claude) ==="
echo "Target: ${TARGET_URL:-none}"
echo "Iterations: $ITERATIONS"
echo ""

mkdir -p "$PROGRESS_DIR" "$LOG_DIR" "$STATE_DIR"
if [ ! -f "report-qa.json" ]; then
  echo '[]' > report-qa.json
fi

# ─── Dev server ───
#
# `npm run dev` is four processes deep: npm -> sh -c -> node next -> next-server
# (plus workers). Killing the npm pid alone kills only the first two: the node
# child survives, reparents to init, and keeps serving the port. Next then
# refuses to start a second dev server ("Another next dev server is already
# running") and exits 1 rather than falling back to another port, so a later
# cycle would test against the orphan while its own cleanup no-ops on a pid that
# is already dead.
#
# Two changes fix that: sweep any orphan before starting, and start under setsid
# so the whole tree lands in its own process group that the trap can take down.
stop_dev() {
  kill -- "-$DEV_PID" 2>/dev/null ||
    kill "$DEV_PID" 2>/dev/null || true      # in case setsid forked and $! is not the leader
  pkill -f "next dev --port $DEV_PORT" 2>/dev/null || true
}

pkill -f "next dev --port $DEV_PORT" 2>/dev/null || true

DEV_LOG="$LOG_DIR/dev-server.log"
setsid npm run dev > "$DEV_LOG" 2>&1 &
DEV_PID=$!
# `|| true` inside stop_dev because under `set -e` a failed kill (dev server
# already gone) would abort the trap and make the phase exit non-zero even on a
# successful QA_COMPLETE.
trap stop_dev EXIT
echo "Dev server starting (PID: $DEV_PID, log: $DEV_LOG)"

# Poll for readiness instead of sleeping a fixed 5s and hoping. A server that
# never comes up has to fail loudly here — the old code carried on regardless,
# so the failure surfaced later as inexplicable QA results.
dev_ready=""
for _ in $(seq 60); do
  if curl -sf -o /dev/null "http://localhost:$DEV_PORT/" 2>/dev/null; then
    dev_ready=1
    break
  fi
  sleep 1
done
if [ -z "$dev_ready" ]; then
  echo "Error: dev server never became ready on port $DEV_PORT (60s). Last output:"
  tail -20 "$DEV_LOG" 2>/dev/null || true
  exit 1
fi
echo "Dev server ready on port $DEV_PORT"

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
  timeout 1200 claude -p --dangerously-skip-permissions --chrome --model claude-sonnet-5 \
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
    # Positive proof for the watchdog that a full QA pass actually happened.
    # Without it the watchdog can only observe that prd.json is unchanged, which
    # looks identical whether QA approved every feature or died on startup.
    printf '%s\n' "$(date '+%Y-%m-%d %H:%M:%S') after $i iterations" > "$QA_SENTINEL"
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
echo "Ran out of iterations without reaching QA_COMPLETE — features remain unverified."
echo "Check report-qa.json for results."
