#!/bin/bash
# Phase 3: QA evaluation using a fresh Claude agent as independent evaluator
# Runs Playwright regression first (fast), then Claude in Chrome for visual/interaction QA
set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=ralph-resume.sh
. "$(dirname "$0")/ralph-resume.sh"
parse_resume "$@"; set -- ${RESUME_ARGS[@]+"${RESUME_ARGS[@]}"}

TARGET_URL="${1:-}"
if [ "$RESUMING" = 1 ] && [ -z "$TARGET_URL" ]; then
  TARGET_URL=$(run_target "$RUNS_DIR/$RALPH_RUN_ID")
fi
ITERATIONS="${2:-999}"

MAX_FAILURES="${RALPH_MAX_FAILURES:-3}"   # abort after N consecutive no-promise iterations

STATE_DIR="ralph/.state"
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

# The session runner: usage accounting, resume-on-missing-promise, and the
# single run-wide progress file every agent appends to. Sourced BEFORE the
# guards below so they can fail through fail_phase and be seen in the progress
# file; sourcing it costs nothing but the run namespace it would create anyway.
# shellcheck source=ralph-lib.sh
. "$(dirname "$0")/ralph-lib.sh"

# The gate framework: preconditions that are repaired by an agent rather than
# being fatal. Sourced after ralph-lib.sh, which provides run_iteration.
# shellcheck source=ralph-gates.sh
. "$(dirname "$0")/ralph-gates.sh"

if [ ! -f "prd.json" ]; then
  fail_phase "prd.json not found — run ralph-build.sh first."
fi

echo "=== Phase 3 (QA with Claude) ==="
echo "Target: ${TARGET_URL:-none}"
echo "Iterations: $ITERATIONS"
echo "Progress: $PROGRESS"
echo ""

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
  announce_dev_down
}

DEV_LOG="$RUN_DIR/dev-server.log"
DEV_PID=""

start_dev() {
  pkill -f "next dev --port $DEV_PORT" 2>/dev/null || true
  setsid npm run dev > "$DEV_LOG" 2>&1 &
  DEV_PID=$!
}

# The clone is only reachable while this phase is running: the server starts in
# the gate below and dies with the phase, so a progress file that does not say
# when leaves anyone reading it — or tailing it live — guessing whether the URL
# they have is still worth opening. 127.0.0.1 rather than localhost because on
# this machine localhost can resolve to ::1 first, where nothing is listening.
DEV_URL="http://127.0.0.1:$DEV_PORT"

# Announced strictly in pairs. The gate restarts the server on every repair
# attempt, so keying the "down" note on whether an "up" was ever announced keeps
# a repair cycle from filling the progress file with stop/start churn that says
# nothing the gate has not already said.
DEV_SERVING=0

announce_dev_up() {
  DEV_SERVING=1
  note "[ralph] The clone is now being served — access through $DEV_URL (Next.js dev server on port $DEV_PORT). It stays up only for this QA phase."
}

announce_dev_down() {
  [ "$DEV_SERVING" = 1 ] || return 0
  DEV_SERVING=0
  note "[ralph] The clone is no longer being served — $DEV_URL is down (dev server stopped with the QA phase)."
}

# `|| true` inside stop_dev because under `set -e` a failed kill (dev server
# already gone) would abort the trap and make the phase exit non-zero even on a
# successful QA_COMPLETE.
trap 'stop_dev; reap_sessions; exit 130' INT
trap 'stop_dev; reap_sessions; exit 143' TERM
trap 'stop_dev; reap_sessions' EXIT

# ─── The dev-server gate ───
#
# Readiness used to be a 60s poll ending in `exit 1`. That spent one of the
# watchdog's three QA attempts on a condition an agent could fix, and said
# nothing in the progress file on the way out. It is a gate now: the check is
# unchanged, but a failure is handed to a repair agent and re-checked, and only
# an unrepairable one stops the phase.
#
# reset restarts the server: whatever the repair agent changed — a cache, a
# migration, a source file — has to be picked up by a process started after it,
# and a server left 500ing from before the fix would fail the re-check for a
# reason that no longer exists.
gate_dev_server_desc="\`npm run dev\` serves HTTP 200 at http://localhost:$DEV_PORT/ (it is the clone under test)"

gate_dev_server_reset() {
  stop_dev
  start_dev
  echo "Dev server starting (PID: $DEV_PID, log: $DEV_LOG)" >&2
}

gate_dev_server_check() {
  local _
  for _ in $(seq 60); do
    curl -sf -o /dev/null "http://localhost:$DEV_PORT/" 2>/dev/null && return 0
    sleep 1
  done
  return 1
}

# The HTTP body matters as much as the log: Next.js serves its compile errors as
# the page, so the reason for a 500 is often only in the response.
gate_dev_server_diag() {
  echo "--- last 80 lines of $DEV_LOG ---"
  tail -80 "$DEV_LOG" 2>/dev/null || echo "(no dev server log)"
  echo
  echo "--- HTTP status and body of / ---"
  curl -s -o /tmp/ralph-gate-body.$$ -w 'status: %{http_code}\n' \
    "http://localhost:$DEV_PORT/" 2>/dev/null || echo "(no response at all)"
  head -c 3000 /tmp/ralph-gate-body.$$ 2>/dev/null; rm -f /tmp/ralph-gate-body.$$
  echo
  echo "--- listeners on $DEV_PORT ---"
  { ss -ltnp 2>/dev/null || netstat -ltnp 2>/dev/null; } | grep "$DEV_PORT" || echo "(nothing listening)"
  echo
  echo "--- next dev processes ---"
  ps aux 2>/dev/null | grep "[n]ext dev" || echo "(none)"
  echo
  echo "--- recent commits ---"
  git log --oneline -5 2>/dev/null
  echo
  echo "--- working tree ---"
  git status --short 2>/dev/null | head -30
}

if ! run_gates qa dev_server; then
  fail_phase "the dev server never became usable on port $DEV_PORT and could not be repaired — QA cannot test a clone that does not serve."
fi
# Announced here rather than in start_dev: the gate has just proved the server
# actually answers, and "being served" should mean served, not merely spawned.
announce_dev_up
echo "Dev server ready on port $DEV_PORT ($DEV_URL)"

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

[ "$RESUMING" = 1 ] && resume_banner "$PROGRESS" "qa"
note "═══════════════════════════════════════════════════════"
note "Phase 3 (QA) starting — target=${TARGET_URL:-none} model=$MODEL max-iter=$ITERATIONS"

# qa_demote_untested — an untested feature is not a passing feature.
#
# QA_COMPLETE means "every feature has been tested", the sentinel it writes is
# what makes the watchdog stop cycling, and the claim was never checked against
# what QA actually recorded. It does not have to be true. Measured on a real run:
# QA reported QA_COMPLETE after 6 iterations with 14 of 29 features in
# report-qa.json and features 015-029 never tested at all. The watchdog printed
# "ALL 29 FEATURES: PASSED + QA VERIFIED", broke out of cycle 1 of 5, and ended
# the run — not because it skipped its Build↔QA cycling, but because nothing was
# marked failing, so there was nothing left to send back.
#
# Untested is therefore demoted to passes:false. That is the honest state, and it
# is also the state the rest of the orchestrator already knows how to act on:
# all_passed goes false, so the watchdog cycles back to build on its own with no
# special case anywhere. Coverage is checked here for the same reason
# ralph-gates.sh re-runs a gate's check instead of believing an agent that said
# FIXED — the claim is evidence, not proof.
#
# Prints the UNTESTED ids, space separated — not the demoted ones. The two
# differ on the second pass: once an untested feature has been demoted there is
# nothing left to demote, and keying the decision on "did I demote anything"
# would then accept the very next QA_COMPLETE while the feature was still
# untested. Coverage is a property of report-qa.json, so that is what is read.
qa_untested() {
  python3 <<'PY'
import json, os

try:
    prd = json.load(open("prd.json"))
    if not isinstance(prd, list):
        raise ValueError
except Exception:
    print("")                        # a corrupt prd.json is require_prd's problem
    raise SystemExit(0)

tested = set()
if os.path.exists("report-qa.json"):
    try:
        rep = json.load(open("report-qa.json"))
        if isinstance(rep, list):
            tested = {e.get("feature_id") for e in rep if isinstance(e, dict)}
    except Exception:
        pass

untested, demoted = [], []
for f in prd:
    if not isinstance(f, dict):
        continue
    fid = f.get("id")
    if not fid or fid in tested:
        continue
    untested.append(fid)
    if f.get("passes"):          # only the ones still claiming to pass change
        f["passes"] = False
        demoted.append(fid)

if demoted:
    with open("prd.json", "w") as fh:
        json.dump(prd, fh, indent=2)
        fh.write("\n")
print(" ".join(untested))
PY
}

consecutive_failures=0
false_completes=0
MAX_FALSE_COMPLETES="${RALPH_MAX_FALSE_COMPLETES:-3}"

for ((i=1; i<=ITERATIONS; i++)); do
  echo "--- QA iteration $i/$ITERATIONS ---"

  PROMPT_FILE="$RUN_DIR/prompt-qa-$i.txt"
  {
    cat <<PROMPT
@ralph/prompt-qa.md @pre-setup.md @spec-build.md @prd.json @report-qa.json @claude-in-chrome-reference.md

ITERATION: $i of $ITERATIONS
PROGRESS: $PROGRESS
CLONE_URL: http://localhost:3015
${TARGET_CONTEXT}

Test exactly ONE feature, then commit, push, and stop.
Output <promise>NEXT</promise> when done with this feature.
If ALL features have been QA tested and all bugs fixed, output <promise>QA_COMPLETE</promise>.

## Orchestrator notes (these refine, never override, the instructions above)
- This is QA iteration $i. You are a fresh, clean-context session and a DIFFERENT agent from the builder: all continuity is on disk ($PROGRESS, prd.json, report-qa.json, git history). Study before assuming.
- $PROGRESS is the single progress file for this whole run — every phase and every session appends to it. Read its tail (\`tail -200 $PROGRESS\`) to see what has already been tested, and what the build sessions claimed. Do NOT read the whole file; it grows all run.
- This session is terminated after $WATCHDOG seconds with no append to $PROGRESS. Narrate as you go.
- Your final message is parsed by the orchestrator for the promise tag ONLY: end with <promise>NEXT</promise> or <promise>QA_COMPLETE</promise> and stop. A missing tag counts as an abnormal exit.
PROMPT
  } > "$PROMPT_FILE"

  run_iteration "qa-$i" "$PROMPT_FILE" 'NEXT|QA_COMPLETE'
  p="$ITER_PROMISE"

  if [ "$p" = "QA_COMPLETE" ]; then
    # The claim is checked before it is acted on. Anything QA never recorded
    # testing goes back to passes:false, which is both the honest state and the
    # one that makes the watchdog resume cycling without a special case.
    untested="$(qa_untested)"
    if [ -n "$untested" ]; then
      false_completes=$((false_completes + 1))
      note "[ralph] QA said QA_COMPLETE, but report-qa.json has no entry for: $untested"
      note "[ralph] An untested feature is not a passing feature — those are back to passes:false ($false_completes/$MAX_FALSE_COMPLETES). QA continues."
      echo "WARNING: QA_COMPLETE rejected — $(wc -w <<<"$untested") feature(s) never tested. Demoted to passes:false."

      # QA gets to finish its own job first; only once it keeps insisting it is
      # done does the phase end and hand the still-false features to build.
      if [ "$false_completes" -ge "$MAX_FALSE_COMPLETES" ]; then
        note "[ralph] QA has claimed QA_COMPLETE $false_completes times with features still untested — ending the phase and letting the watchdog cycle back to build."
        # The sentinel still goes out: a full pass DID run, and the watchdog
        # needs to tell that from a QA that died on startup. The demoted features
        # carry the real verdict — all_passed is now false, so it cycles.
        printf '%s\n' "$(date '+%Y-%m-%d %H:%M:%S') after $i iterations, $false_completes incomplete QA_COMPLETE claim(s)" > "$QA_SENTINEL"
        exit 0
      fi
      continue
    fi

    echo ""
    echo "--- Running final Playwright regression suite ---"
    npx playwright test --reporter=list 2>&1 || echo "Some Playwright tests failed in final regression."
    echo ""
    echo "=== QA complete after $i iterations! ==="
    note "[ralph] Phase 3 (QA) reported QA_COMPLETE after $i iterations, with every feature in prd.json covered by report-qa.json."
    # Positive proof for the watchdog that a full QA pass actually happened.
    # Without it the watchdog can only observe that prd.json is unchanged, which
    # looks identical whether QA approved every feature or died on startup.
    printf '%s\n' "$(date '+%Y-%m-%d %H:%M:%S') after $i iterations" > "$QA_SENTINEL"
    exit 0
  fi

  if [ "$p" = "NEXT" ]; then
    consecutive_failures=0
    echo "QA for feature done. Moving to next..."
    continue
  fi

  # No promise, and the resumes inside run_iteration could not get one either.
  consecutive_failures=$((consecutive_failures + 1))
  echo "WARNING: no promise after $RESUMES_USED resume(s) ($consecutive_failures/$MAX_FAILURES). Session JSON: $LAST_JSON"
  note "[ralph] QA iteration $i produced no promise after $RESUMES_USED resume(s) ($consecutive_failures/$MAX_FAILURES)."

  if [ "$consecutive_failures" -ge "$MAX_FAILURES" ]; then
    echo ""
    echo "=== Aborting: $MAX_FAILURES consecutive iterations produced no promise ==="
    echo "Check $LAST_JSON.err and report-qa.json."
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
