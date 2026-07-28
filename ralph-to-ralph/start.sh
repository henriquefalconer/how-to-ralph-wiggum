#!/bin/bash
# Start the Ralph-to-Ralph cloning loop
# Usage: ./ralph-to-ralph/start.sh <target-url>
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET_URL="${1:?Usage: $0 <target-url>}"
LOCKFILE="ralph-to-ralph/.state/watchdog.lock"

echo "=== Ralph-to-Ralph ==="
echo "Target: $TARGET_URL"
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
./ralph-to-ralph/ralph-watchdog.sh "$TARGET_URL"
