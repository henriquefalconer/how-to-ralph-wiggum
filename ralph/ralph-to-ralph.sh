#!/bin/bash
# Start the Ralph-to-Ralph cloning loop: Inspect → Build → QA, under the watchdog.
#
# The watchdog is what separates this from running the three phases by hand: it
# restarts a phase that stops early, cycles Build ↔ QA while features still
# fail, and commits between phases.
#
# Usage:
#   ./ralph/ralph-to-ralph.sh <target-url> [inspect-iters] [build-iters] [qa-iters]
#   ./ralph/ralph-to-ralph.sh --resume [run-id] [target-url] [iters...]
#   ./ralph/ralph-to-ralph.sh --list
#
# --resume continues an existing run rather than starting a new one: same run id,
# same directory, same progress file appended to, same cost ledger, and session
# numbering carrying on. The phase is re-derived from the state on disk and each
# phase's iteration counter starts again at 1. With no run id it takes the most
# recent run; with no target url it uses the one that run recorded.
set -euo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=ralph-resume.sh
. "$(dirname "$0")/ralph-resume.sh"

LOCKFILE="ralph/.state/watchdog.lock"

parse_resume "$@"; set -- ${RESUME_ARGS[@]+"${RESUME_ARGS[@]}"}

TARGET_URL="${1:-}"
INSPECT_ITERS="${2:-999}"
BUILD_ITERS="${3:-999}"
QA_ITERS="${4:-999}"

# Resuming without repeating the url: it was recorded when the run started.
if [ "$RESUMING" = 1 ] && [ -z "$TARGET_URL" ]; then
  TARGET_URL=$(run_target "$RUNS_DIR/$RALPH_RUN_ID")
  if [ -z "$TARGET_URL" ]; then
    echo "Run $RALPH_RUN_ID did not record a target url — pass it explicitly:" >&2
    echo "  $0 --resume $RALPH_RUN_ID <target-url>" >&2
    exit 1
  fi
fi

if [ -z "$TARGET_URL" ]; then
  sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//' >&2
  exit 1
fi

# One run id for the whole pipeline. Every phase inherits it, so all three write
# their session JSONs into one directory and append to ONE progress file — the
# single place to watch a run, and the only way session numbering stays unique
# across three separate phase processes.
export RALPH_RUN_ID="${RALPH_RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)}"
RUN_DIR="$RUNS_DIR/$RALPH_RUN_ID"
export RALPH_PROGRESS="$RUN_DIR/progress.txt"

echo "========================================="
echo "  RALPH-TO-RALPH: Product Cloner"
echo "========================================="
echo "Target:           $TARGET_URL"
echo "Inspect iters:    $INSPECT_ITERS"
echo "Build iters:      $BUILD_ITERS"
echo "QA iters:         $QA_ITERS"
if [ "$RESUMING" = 1 ]; then
  echo "Run id:           $RALPH_RUN_ID (RESUMING)"
  echo "Spent so far:     \$$(run_spend "$RUN_DIR")"
  echo "Sessions so far:  $(cat "$RUN_DIR/.session-counter" 2>/dev/null || echo 0)"
else
  echo "Run id:           $RALPH_RUN_ID"
fi
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
# Recorded so --resume can pick the run up without being told the url again.
printf '%s\n' "$TARGET_URL" > "$RUN_DIR/target-url"

[ "$RESUMING" = 1 ] && resume_banner "$RALPH_PROGRESS" "pipeline"

echo "Starting watchdog..."
echo "=================================="
./ralph/ralph-watchdog.sh "$TARGET_URL" "$INSPECT_ITERS" "$BUILD_ITERS" "$QA_ITERS"
