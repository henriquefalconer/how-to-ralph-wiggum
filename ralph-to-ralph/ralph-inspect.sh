#!/bin/bash
# Phase 1: Inspect a target product with Claude in Chrome and generate a PRD
# Each iteration = exactly 1 page/feature (enforced by prompt)
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET_URL="${1:?Usage: $0 <target-url> [iterations]}"
ITERATIONS="${2:-999}"

MAX_FAILURES="${RALPH_MAX_FAILURES:-3}"   # abort after N consecutive no-promise iterations

STATE_DIR="ralph-to-ralph/.state"
PROGRESS_DIR="$STATE_DIR/progress/inspect"
LOG_DIR="$STATE_DIR/logs/inspect"
TARGET_FILE="$STATE_DIR/inspect-target"

echo "=== RALPH-TO-RALPH: Phase 1 (Inspect) ==="
echo "Target: $TARGET_URL"
echo "Iterations: $ITERATIONS"
echo ""

mkdir -p "$STATE_DIR"

# Re-inspecting a *different* product is not enough on its own: every artifact
# of the previous run is still on disk, and the prompt tells this agent to
# *append* to prd.json and update spec-build.md incrementally. Left alone, run
# #2 starts from run #1's feature list and builds a chimera of two products.
# The inspect-complete sentinel is keyed by URL, so the phase correctly re-runs
# — this is what makes the re-run start from a clean slate. Artifacts are moved
# aside rather than deleted; a run's output is expensive to reproduce.
PREVIOUS_TARGET=""
if [ -f "$TARGET_FILE" ]; then
  PREVIOUS_TARGET=$(cat "$TARGET_FILE" 2>/dev/null || true)
fi

if [ -n "$PREVIOUS_TARGET" ] && [ "$PREVIOUS_TARGET" != "$TARGET_URL" ]; then
  ARCHIVE="$STATE_DIR/archive/$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$ARCHIVE"
  echo "Target changed:"
  echo "  was: $PREVIOUS_TARGET"
  echo "  now: $TARGET_URL"
  for artifact in prd.json spec-build.md sitemap.md docs-extract.md report-qa.json \
                  clone-product-docs screenshots; do
    if [ -e "$artifact" ]; then
      mv "$artifact" "$ARCHIVE/"
    fi
  done
  # The journals describe the old product too, and the loops feed the most
  # recent few straight back into the prompt.
  if [ -d "$STATE_DIR/progress" ]; then
    mv "$STATE_DIR/progress" "$ARCHIVE/progress"
  fi
  rm -f "$STATE_DIR/inspect-complete" "$STATE_DIR/qa-complete"
  echo "Archived the previous target's artifacts to $ARCHIVE"
  echo ""
fi
printf '%s\n' "$TARGET_URL" > "$TARGET_FILE"

# Initialize files
if [ ! -f "prd.json" ]; then
  echo '[]' > prd.json
fi
mkdir -p screenshots "$PROGRESS_DIR" "$LOG_DIR"

# The browser is driven with claude-in-chrome from inside the agent's turn, so
# there is no session for this script to start or stop — the loop just passes
# --chrome and the agent works in the Chrome window that is already open.

consecutive_failures=0

for ((i=1; i<=$ITERATIONS; i++)); do
  echo "--- Inspection iteration $i/$ITERATIONS ---"

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
"@ralph-to-ralph/prompt-inspect.md @ralph-to-ralph/spec-inspect.md @claude-in-chrome-reference.md @prd.json $PROGRESS_REFS

TARGET URL: $TARGET_URL
ITERATION: $i of $ITERATIONS
PROGRESS_FILE: $PROGRESS_FILE

Inspect exactly ONE page/feature, then commit, push, and stop.
Write this iteration's notes to $PROGRESS_FILE — that file is yours alone. Never
append to an earlier iteration's file; the loop only feeds back the most recent few.
Output <promise>NEXT</promise> when done with this page.
Output <promise>INSPECT_COMPLETE</promise> only if ALL pages are inspected AND spec-build.md is finalized." \
    2>&1 | tee "$LOG" || rc=${PIPESTATUS[0]}

  if grep -qF "<promise>INSPECT_COMPLETE</promise>" "$LOG"; then
    echo ""
    echo "=== Inspection complete after $i iterations ==="
    echo "PRD: prd.json"
    echo "Build spec: spec-build.md"
    # Record which target this was, so a later run against a different URL
    # re-inspects instead of inheriting this run's prd.json.
    printf '%s\n' "$TARGET_URL" > "$STATE_DIR/inspect-complete"
    exit 0
  fi

  if grep -qF "<promise>NEXT</promise>" "$LOG"; then
    consecutive_failures=0
    echo "Page done. Moving to next iteration..."
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
    echo "Something is broken rather than merely slow. Check $LOG."
    exit 1
  fi

  sleep $((3 * consecutive_failures))
done

echo ""
echo "=== Inspection finished after $ITERATIONS iterations ==="
echo "PRD: prd.json (may be incomplete)"
