#!/bin/bash
# Phase 2: Build a clone from the generated PRD and build spec
# Each iteration = exactly 1 feature (enforced by prompt + NEXT/COMPLETE promises)
set -uo pipefail
cd "$(dirname "$0")/.."

ITERATIONS="${1:-999}"

MAX_FAILURES="${RALPH_MAX_FAILURES:-3}"   # abort after N consecutive no-promise iterations

if [ ! -f "prd.json" ]; then
  echo "Error: prd.json not found. Run ralph-inspect.sh first."
  exit 1
fi

if [ ! -f "spec-build.md" ]; then
  echo "Error: spec-build.md not found. Run ralph-inspect.sh first."
  exit 1
fi

# The session runner: usage accounting, resume-on-missing-promise, and the
# single run-wide progress file every agent appends to.
# shellcheck source=ralph-lib.sh
. "$(dirname "$0")/ralph-lib.sh"

trap 'reap_sessions; exit 130' INT
trap 'reap_sessions; exit 143' TERM
trap 'reap_sessions' EXIT

echo "=== RALPH-TO-RALPH: Phase 2 (Build) ==="
echo "Iterations: $ITERATIONS"
echo "Progress: $PROGRESS"
echo ""

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

note "═══════════════════════════════════════════════════════"
note "ralph-to-ralph Phase 2 (Build) starting — model=$MODEL max-iter=$ITERATIONS"

consecutive_failures=0

for ((i=1; i<=ITERATIONS; i++)); do
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

  PROMPT_FILE="$RUN_DIR/prompt-build-$i.txt"
  {
    cat <<PROMPT
@ralph-to-ralph/prompt-build.md @pre-setup.md @spec-build.md @prd.json @CLAUDE.md

ITERATION: $i of $ITERATIONS
PROGRESS_COUNT: $PASSES/$TOTAL features passed
PROGRESS: $PROGRESS

Build exactly ONE feature (the first passes:false entry), then commit, push, and stop.
Output <promise>NEXT</promise> when done with this feature.
Output <promise>COMPLETE</promise> only if ALL features pass.

## Orchestrator notes (these refine, never override, the instructions above)
- This is build iteration $i. You are a fresh, clean-context session: all continuity is on disk ($PROGRESS, prd.json, spec-build.md, git history). Study before assuming.
- $PROGRESS is the single progress file for this whole run — every phase and every session appends to it. Read its tail (\`tail -200 $PROGRESS\`) to see what has already been built. Do NOT read the whole file; it grows all run.
- This session is terminated after $WATCHDOG seconds with no append to $PROGRESS. Narrate as you go.
- Your final message is parsed by the orchestrator for the promise tag ONLY: end with <promise>NEXT</promise> or <promise>COMPLETE</promise> and stop. A missing tag counts as an abnormal exit.
PROMPT
  } > "$PROMPT_FILE"

  run_iteration "build-$i" "$PROMPT_FILE" 'NEXT|COMPLETE'
  p="$ITER_PROMISE"

  if [ "$p" = "COMPLETE" ]; then
    echo ""
    echo "=== Build complete after $i iterations! All $(total_tasks) features pass. ==="
    note "[ralph] Phase 2 (Build) reported COMPLETE after $i iterations."
    exit 0
  fi

  if [ "$p" = "NEXT" ]; then
    consecutive_failures=0
    echo "Feature done. Moving to next iteration..."
    continue
  fi

  # No promise, and the resumes inside run_iteration could not get one either.
  consecutive_failures=$((consecutive_failures + 1))
  echo "WARNING: no promise after $RESUMES_USED resume(s) ($consecutive_failures/$MAX_FAILURES). Session JSON: $LAST_JSON"
  note "[ralph] build iteration $i produced no promise after $RESUMES_USED resume(s) ($consecutive_failures/$MAX_FAILURES)."

  if [ "$consecutive_failures" -ge "$MAX_FAILURES" ]; then
    echo ""
    echo "=== Aborting: $MAX_FAILURES consecutive iterations produced no promise ==="
    echo "Passes: $(count_passes)/$(total_tasks). Check $LAST_JSON.err."
    exit 1
  fi

  sleep $((3 * consecutive_failures))
done

echo ""
echo "=== Build finished after $ITERATIONS iterations ==="
echo "Passes: $(count_passes)/$(total_tasks). Check prd.json for remaining."
