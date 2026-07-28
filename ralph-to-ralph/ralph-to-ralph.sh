#!/bin/bash
# Start the Ralph-to-Ralph cloning loop: Inspect → Build → QA, under the watchdog.
#
# The watchdog is what separates this from running the three phases by hand: it
# restarts a phase that stops early, cycles Build ↔ QA while features still
# fail, and commits between phases.
#
# Usage: ./ralph-to-ralph/ralph-to-ralph.sh <target-url> [inspect-iters] [build-iters] [qa-iters]
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET_URL="${1:?Usage: $0 <target-url> [inspect-iters] [build-iters] [qa-iters]}"
INSPECT_ITERS="${2:-999}"
BUILD_ITERS="${3:-999}"
QA_ITERS="${4:-999}"

LOCKFILE="ralph-to-ralph/.state/watchdog.lock"

# One run id for the whole pipeline. Every phase inherits it, so all three write
# their session JSONs into one directory and append to ONE progress file — the
# single place to watch a run, and the only way session numbering stays unique
# across three separate phase processes.
export RALPH_RUN_ID="${RALPH_RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)}"
RUN_DIR="ralph-to-ralph/.state/runs/$RALPH_RUN_ID"
export RALPH_PROGRESS="$RUN_DIR/progress.txt"

echo "========================================="
echo "  RALPH-TO-RALPH: Product Cloner"
echo "========================================="
echo "Target:           $TARGET_URL"
echo "Inspect iters:    $INSPECT_ITERS"
echo "Build iters:      $BUILD_ITERS"
echo "QA iters:         $QA_ITERS"
echo "Run id:           $RALPH_RUN_ID"
echo "Progress:         $RALPH_PROGRESS"
echo "========================================="
echo ""
echo "Watch it live with:  tail -f $RALPH_PROGRESS"
echo ""

# Kill existing watchdog if running
if [ -f "$LOCKFILE" ]; then
  PID=$(cat "$LOCKFILE" 2>/dev/null)
  if kill -0 "$PID" 2>/dev/null; then
    echo "Stopping existing watchdog (PID $PID)..."
    kill "$PID" 2>/dev/null || true
    sleep 2
  fi
  rm -f "$LOCKFILE"
fi

# One directory per run: session JSONs, assembled prompts, and the single
# progress file all three phases append to.
mkdir -p "$RUN_DIR"
touch "$RALPH_PROGRESS"

echo "Starting watchdog..."
echo "=================================="
./ralph-to-ralph/ralph-watchdog.sh "$TARGET_URL" "$INSPECT_ITERS" "$BUILD_ITERS" "$QA_ITERS"
