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

echo "========================================="
echo "  RALPH-TO-RALPH: Product Cloner"
echo "========================================="
echo "Target:           $TARGET_URL"
echo "Inspect iters:    $INSPECT_ITERS"
echo "Build iters:      $BUILD_ITERS"
echo "QA iters:         $QA_ITERS"
echo "========================================="
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

# Per-phase state: one journal file per iteration, plus that phase's transcripts.
mkdir -p ralph-to-ralph/.state/progress/{inspect,build,qa} ralph-to-ralph/.state/logs/{inspect,build,qa}

echo "Starting watchdog..."
echo "=================================="
./ralph-to-ralph/ralph-watchdog.sh "$TARGET_URL" "$INSPECT_ITERS" "$BUILD_ITERS" "$QA_ITERS"
