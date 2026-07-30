#!/bin/bash
# Phase 1: Inspect a target product with Claude in Chrome and generate a PRD
# Each iteration = exactly 1 page/feature (enforced by prompt)
set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=ralph-resume.sh
. "$(dirname "$0")/ralph-resume.sh"
parse_resume "$@"; set -- ${RESUME_ARGS[@]+"${RESUME_ARGS[@]}"}

TARGET_URL="${1:-}"
if [ "$RESUMING" = 1 ] && [ -z "$TARGET_URL" ]; then
  TARGET_URL=$(run_target "$RUNS_DIR/$RALPH_RUN_ID")
fi
: "${TARGET_URL:?Usage: $0 [--resume [run-id]] <target-url> [iterations]}"
ITERATIONS="${2:-999}"

MAX_FAILURES="${RALPH_MAX_FAILURES:-3}"   # abort after N consecutive no-promise iterations

STATE_DIR="ralph/.state"
TARGET_FILE="$STATE_DIR/inspect-target"

# The session runner: usage accounting, resume-on-missing-promise, and the
# single run-wide progress file every agent appends to.
# shellcheck source=ralph-lib.sh
. "$(dirname "$0")/ralph-lib.sh"

trap 'reap_sessions; exit 130' INT
trap 'reap_sessions; exit 143' TERM
trap 'reap_sessions' EXIT

echo "=== Phase 1 (Inspect) ==="
echo "Target: $TARGET_URL"
echo "Iterations: $ITERATIONS"
echo "Progress: $PROGRESS"
echo ""

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
  rm -f "$STATE_DIR/inspect-complete" "$STATE_DIR/qa-complete"
  echo "Archived the previous target's artifacts to $ARCHIVE"
  echo ""
fi
printf '%s\n' "$TARGET_URL" > "$TARGET_FILE"

# Initialize files
if [ ! -f "prd.json" ]; then
  echo '[]' > prd.json
fi
mkdir -p screenshots

# The browser is driven with claude-in-chrome from inside the agent's turn, so
# there is no session for this script to start or stop — the loop just passes
# --chrome and the agent works in the Chrome window that is already open.

[ "$RESUMING" = 1 ] && resume_banner "$PROGRESS" "inspect"
note "═══════════════════════════════════════════════════════"
note "Phase 1 (Inspect) starting — target=$TARGET_URL model=$MODEL max-iter=$ITERATIONS"

consecutive_failures=0

for ((i=1; i<=ITERATIONS; i++)); do
  echo "--- Inspection iteration $i/$ITERATIONS ---"

  PROMPT_FILE="$RUN_DIR/prompt-inspect-$i.txt"
  {
    cat <<PROMPT
@ralph/prompt-inspect.md @ralph/spec-inspect.md @prd.json

TARGET URL: $TARGET_URL
ITERATION: $i of $ITERATIONS
PROGRESS: $PROGRESS

Inspect exactly ONE page/feature, then commit, push, and stop.
Output <promise>NEXT</promise> when done with this page.
Output <promise>INSPECT_COMPLETE</promise> only if ALL pages are inspected AND spec-build.md is finalized.

## Orchestrator notes (these refine, never override, the instructions above)
- This is inspect iteration $i. You are a fresh, clean-context session: all continuity is on disk ($PROGRESS, prd.json, spec-build.md, git history). Study before assuming.
- $PROGRESS is the single progress file for this whole run — every phase and every session appends to it. Read its tail (\`tail -200 $PROGRESS\`) to see what has already been inspected. Do NOT read the whole file; it grows all run.
- This session is terminated after $WATCHDOG seconds with no append to $PROGRESS. Narrate as you go.
- Your final message is parsed by the orchestrator for the promise tag ONLY: end with <promise>NEXT</promise> or <promise>INSPECT_COMPLETE</promise> and stop. A missing tag counts as an abnormal exit.
PROMPT
  } > "$PROMPT_FILE"

  run_iteration "inspect-$i" "$PROMPT_FILE" 'NEXT|INSPECT_COMPLETE'
  p="$ITER_PROMISE"

  if [ "$p" = "INSPECT_COMPLETE" ]; then
    echo ""
    echo "=== Inspection complete after $i iterations ==="
    echo "PRD: prd.json"
    echo "Build spec: spec-build.md"
    note "[ralph] Phase 1 (Inspect) complete after $i iterations."
    # Record which target this was, so a later run against a different URL
    # re-inspects instead of inheriting this run's prd.json.
    printf '%s\n' "$TARGET_URL" > "$STATE_DIR/inspect-complete"
    exit 0
  fi

  if [ "$p" = "NEXT" ]; then
    consecutive_failures=0
    echo "Page done. Moving to next iteration..."
    continue
  fi

  # No promise, and the resumes inside run_iteration could not get one either.
  consecutive_failures=$((consecutive_failures + 1))
  echo "WARNING: no promise after $RESUMES_USED resume(s) ($consecutive_failures/$MAX_FAILURES). Session JSON: $LAST_JSON"
  note "[ralph] inspect iteration $i produced no promise after $RESUMES_USED resume(s) ($consecutive_failures/$MAX_FAILURES)."

  if [ "$consecutive_failures" -ge "$MAX_FAILURES" ]; then
    echo ""
    echo "=== Aborting: $MAX_FAILURES consecutive iterations produced no promise ==="
    echo "Something is broken rather than merely slow. Check $LAST_JSON.err."
    exit 1
  fi

  sleep $((3 * consecutive_failures))
done

echo ""
echo "=== Inspection finished after $ITERATIONS iterations ==="
echo "PRD: prd.json (may be incomplete)"
