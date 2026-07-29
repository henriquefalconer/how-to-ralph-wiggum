setup() {
  REPO="$BATS_TEST_TMPDIR/repo"
  mkdir -p "$REPO/ralph/.state" "$REPO/bin"
  cp "$BATS_TEST_DIRNAME/ralph-qa.sh" "$BATS_TEST_DIRNAME/ralph-lib.sh" \
     "$BATS_TEST_DIRNAME/ralph-resume.sh" "$BATS_TEST_DIRNAME/ralph-gates.sh" "$REPO/ralph/"

  export RALPH_RUN_ID="TESTRUN"
  RUN_DIR="$REPO/ralph/.state/runs/TESTRUN"
  PROGRESS_FILE="$RUN_DIR/progress.txt"
  SENTINEL="$REPO/ralph/.state/qa-complete"

  export STUB_ARGS="$REPO/claude-args.txt"      # argv, one word per line
  export STUB_STDIN="$REPO/claude-stdin.txt"    # the assembled prompt
  export STUB_CALLS="$REPO/claude-calls.txt"
  export NPM_ARGS="$REPO/npm-args.txt"
  export NPX_ARGS="$REPO/npx-args.txt"
  echo 0 > "$STUB_CALLS"

  export HOME="$REPO/home"; mkdir -p "$HOME"
  export TRANSCRIPT_ROOT="$HOME/.claude/projects/${REPO//\//-}"
  mkdir -p "$TRANSCRIPT_ROOT"

  cat > "$REPO/bin/claude" <<'STUB'
#!/bin/bash
printf '%s\n' "$@" >> "$STUB_ARGS"
cat >> "$STUB_STDIN"
n=$(( $(cat "$STUB_CALLS") + 1 )); echo "$n" > "$STUB_CALLS"
out="STUB_OUT_$n"; rc="STUB_RC_$n"; err="STUB_ERR_$n"
sid="${STUB_SID:-sid-abc}"
printf '{"message":{"id":"m%d","model":"claude-sonnet-5","usage":{"input_tokens":10,"cache_read_input_tokens":%d,"cache_creation_input_tokens":0}}}\n' \
  "$n" "$(( n * 1000 ))" >> "$TRANSCRIPT_ROOT/$sid.jsonl"
python3 -c '
import json, sys
print(json.dumps({
    "session_id": sys.argv[1], "is_error": sys.argv[2] == "1",
    "result": sys.argv[3], "cwd": sys.argv[4], "total_cost_usd": 0.5,
    "modelUsage": {"claude-sonnet-5": {"costUSD": 0.5, "contextWindow": 1000000}},
}))' "$sid" "${!err:-${STUB_ERR:-0}}" "${!out:-${STUB_OUT:-}}" "$PWD"
exit "${!rc:-${STUB_RC:-0}}"
STUB
  chmod +x "$REPO/bin/claude"

  cat > "$REPO/bin/npm" <<'STUB'
#!/bin/bash
printf '%s\n' "$*" >> "$NPM_ARGS"
exit 0
STUB
  chmod +x "$REPO/bin/npm"

  cat > "$REPO/bin/npx" <<'STUB'
#!/bin/bash
printf '%s\n' "$*" >> "$NPX_ARGS"
exit "${NPX_RC:-0}"
STUB
  chmod +x "$REPO/bin/npx"

  # The stubbed `npm run dev` never binds a port, so the readiness poll needs a
  # curl that answers for it. CURL_RC=1 simulates a dev server that never comes up.
  printf '#!/bin/bash\nexit "${CURL_RC:-0}"\n' > "$REPO/bin/curl"
  printf '#!/bin/bash\nexec "$@"\n' > "$REPO/bin/setsid"
  printf '#!/bin/bash\nexit 0\n' > "$REPO/bin/pkill"
  printf '#!/bin/bash\nexit 0\n' > "$REPO/bin/sleep"
  chmod +x "$REPO/bin/curl" "$REPO/bin/setsid" "$REPO/bin/pkill" "$REPO/bin/sleep"

  PATH="$REPO/bin:$PATH"

  echo '[{"id":"f1","passes":true}]' > "$REPO/prd.json"
}

# QA_COMPLETE is only honoured when report-qa.json actually covers every feature
# in prd.json, so a test that wants a clean full pass has to record the coverage
# the real QA agent would have written.
cover_features() { # <feature-id...>
  local ids="" id
  for id in "$@"; do ids="$ids{\"feature_id\":\"$id\",\"status\":\"pass\"},"; done
  printf '[%s]\n' "${ids%,}" > "$REPO/report-qa.json"
}

@test "refuses to run without prd.json" {
  rm "$REPO/prd.json"
  run "$REPO/ralph/ralph-qa.sh" https://example.com 1
  [ "$status" -eq 1 ]
  [[ "$output" == *"prd.json not found"* ]]
}

@test "QA_COMPLETE writes the sentinel the watchdog treats as proof of a full pass" {
  cover_features f1
  export STUB_OUT="<promise>QA_COMPLETE</promise>"
  run "$REPO/ralph/ralph-qa.sh" https://example.com 1
  [ "$status" -eq 0 ]
  [ -f "$SENTINEL" ]
}

# ── an untested feature is not a passing feature ─────────────────────────────
#
# Measured on a real run: QA reported QA_COMPLETE after 6 iterations with 14 of
# 29 features in report-qa.json and features 015-029 never tested. Nothing was
# marked failing, so the watchdog had nothing to send back to build, printed
# "ALL 29 FEATURES: PASSED + QA VERIFIED" and ended the run inside cycle 1 of 5.

passes_of() { # <feature-id> -> true/false as recorded in prd.json
  python3 -c "
import json,sys
for f in json.load(open('$REPO/prd.json')):
    if f.get('id')==sys.argv[1]: print(str(f.get('passes')).lower())" "$1"
}

@test "QA_COMPLETE with an untested feature demotes it to passes:false" {
  echo '[{"id":"f1","passes":true},{"id":"f2","passes":true}]' > "$REPO/prd.json"
  cover_features f1                       # f2 never tested
  export STUB_OUT="<promise>QA_COMPLETE</promise>"
  run "$REPO/ralph/ralph-qa.sh" https://example.com 1
  [ "$(passes_of f1)" = "true" ]
  [ "$(passes_of f2)" = "false" ]
  grep -q "no entry for: f2" "$PROGRESS_FILE"
  grep -q "An untested feature is not a passing feature" "$PROGRESS_FILE"
}

@test "an incomplete QA_COMPLETE is not accepted as a full pass" {
  echo '[{"id":"f1","passes":true},{"id":"f2","passes":true}]' > "$REPO/prd.json"
  cover_features f1
  export STUB_OUT="<promise>QA_COMPLETE</promise>"
  run "$REPO/ralph/ralph-qa.sh" https://example.com 1
  # one iteration, one rejected claim: no sentinel, so nothing is reported verified
  [ ! -f "$SENTINEL" ]
  # and no final-regression run, which only belongs to a genuine completion
  [ "$(grep -c 'playwright test' "$NPX_ARGS" 2>/dev/null || echo 0)" -le 1 ]
}

@test "QA keeps working after a rejected QA_COMPLETE instead of ending the phase" {
  echo '[{"id":"f1","passes":true},{"id":"f2","passes":true}]' > "$REPO/prd.json"
  cover_features f1
  export STUB_OUT="<promise>QA_COMPLETE</promise>"
  run "$REPO/ralph/ralph-qa.sh" https://example.com 2
  # it did not stop at the first claim
  [ "$(cat "$STUB_CALLS")" -eq 2 ]
}

@test "QA that keeps falsely claiming completion ends the phase so the watchdog can cycle" {
  echo '[{"id":"f1","passes":true},{"id":"f2","passes":true}]' > "$REPO/prd.json"
  cover_features f1
  export RALPH_MAX_FALSE_COMPLETES=2
  export STUB_OUT="<promise>QA_COMPLETE</promise>"
  run "$REPO/ralph/ralph-qa.sh" https://example.com 9
  [ "$status" -eq 0 ]
  [ "$(cat "$STUB_CALLS")" -eq 2 ]
  # the sentinel goes out — a pass DID run, and the watchdog must tell that from
  # a QA that died on startup...
  [ -f "$SENTINEL" ]
  grep -q "incomplete QA_COMPLETE claim" "$SENTINEL"
  # ...while the demoted feature is what makes all_passed false, so the watchdog
  # cycles back to build on its own
  [ "$(passes_of f2)" = "false" ]
  grep -q "letting the watchdog cycle back to build" "$PROGRESS_FILE"
}

@test "full coverage is accepted with no demotion and no complaint" {
  echo '[{"id":"f1","passes":true},{"id":"f2","passes":true}]' > "$REPO/prd.json"
  cover_features f1 f2
  export STUB_OUT="<promise>QA_COMPLETE</promise>"
  run "$REPO/ralph/ralph-qa.sh" https://example.com 1
  [ "$status" -eq 0 ]
  [ -f "$SENTINEL" ]
  [ "$(passes_of f1)" = "true" ]
  [ "$(passes_of f2)" = "true" ]
  ! grep -q "untested feature" "$PROGRESS_FILE"
  grep -q "every feature in prd.json covered by report-qa.json" "$PROGRESS_FILE"
}

@test "an already-failing untested feature still blocks the claim, with nothing to demote" {
  # The second pass over the same gap: f2 is untested AND already false, so
  # there is nothing to demote. Keying the decision on "did I demote anything"
  # would accept this QA_COMPLETE while f2 was still untested — coverage is read
  # from report-qa.json precisely so it cannot.
  echo '[{"id":"f1","passes":true},{"id":"f2","passes":false}]' > "$REPO/prd.json"
  cover_features f1
  export STUB_OUT="<promise>QA_COMPLETE</promise>"
  run "$REPO/ralph/ralph-qa.sh" https://example.com 1
  [ ! -f "$SENTINEL" ]
  grep -q "no entry for: f2" "$PROGRESS_FILE"
  [ "$(passes_of f2)" = "false" ]
}

@test "running out of iterations leaves no sentinel" {
  export STUB_OUT="<promise>NEXT</promise>"
  run "$REPO/ralph/ralph-qa.sh" https://example.com 2
  [ ! -f "$SENTINEL" ]
}

@test "clears a stale sentinel even when it exits before QA starts" {
  # The sentinel is the watchdog's only evidence that QA actually ran. Every
  # early exit must therefore invalidate the previous cycle's sentinel first —
  # otherwise the watchdog reads last cycle's verdict as this cycle's.
  echo "stale verdict from an earlier cycle" > "$SENTINEL"
  rm "$REPO/prd.json"
  run "$REPO/ralph/ralph-qa.sh" https://example.com 1
  [ "$status" -eq 1 ]
  [ ! -f "$SENTINEL" ]
}

@test "clears a stale sentinel when the dev server never comes up" {
  echo "stale verdict from an earlier cycle" > "$SENTINEL"
  export CURL_RC=1
  run "$REPO/ralph/ralph-qa.sh" https://example.com 1
  [ "$status" -eq 1 ]
  [[ "$output" == *"could not be repaired"* ]]
  [ ! -f "$SENTINEL" ]
}

@test "a dead dev server is handed to a repair agent before the phase gives up" {
  export CURL_RC=1                 # never healthy, however many times it is fixed
  run "$REPO/ralph/ralph-qa.sh" https://example.com 1
  [ "$status" -eq 1 ]
  # it tried to repair rather than exiting on the first failed poll...
  grep -q "dev_server FAILED" "$PROGRESS_FILE"
  grep -q "repairing dev_server (attempt 1/" "$PROGRESS_FILE"
  # ...and the repair agent got its own prompt, not QA's
  grep -q "prompt-repair.md" "$STUB_STDIN"
  # ...and the phase abort is recorded where the run is actually read
  grep -q "PHASE ABORTED" "$PROGRESS_FILE"
}

@test "the progress file says when the clone starts and stops being served, and where" {
  cover_features f1
  export STUB_OUT="<promise>QA_COMPLETE</promise>"
  run "$REPO/ralph/ralph-qa.sh" https://example.com 1
  [ "$status" -eq 0 ]
  # 127.0.0.1, not localhost: localhost can resolve to ::1 first, where the dev
  # server is not listening.
  grep -q "now being served — access through http://127.0.0.1:3015" "$PROGRESS_FILE"
  grep -q "no longer being served — http://127.0.0.1:3015 is down" "$PROGRESS_FILE"
  # exactly one pair per QA phase, not one per server restart
  [ "$(grep -c "now being served" "$PROGRESS_FILE")" -eq 1 ]
  [ "$(grep -c "no longer being served" "$PROGRESS_FILE")" -eq 1 ]
}

@test "a phase that never got the server up does not claim it was ever served" {
  export CURL_RC=1
  run "$REPO/ralph/ralph-qa.sh" https://example.com 1
  [ "$status" -eq 1 ]
  ! grep -q "now being served" "$PROGRESS_FILE"
  # and no orphan "stopped" note for a server that never came up
  ! grep -q "no longer being served" "$PROGRESS_FILE"
}

@test "a dev server that comes up needs no repair session at all" {
  cover_features f1
  export STUB_OUT="<promise>QA_COMPLETE</promise>"
  run "$REPO/ralph/ralph-qa.sh" https://example.com 1
  [ "$status" -eq 0 ]
  ! grep -q "dev_server FAILED" "$PROGRESS_FILE"
  ! grep -q "prompt-repair.md" "$STUB_STDIN"
}

@test "seeds report-qa.json when missing" {
  export STUB_OUT="<promise>QA_COMPLETE</promise>"
  run "$REPO/ralph/ralph-qa.sh" https://example.com 1
  [ "$status" -eq 0 ]
  [ "$(cat "$REPO/report-qa.json")" = "[]" ]
}

@test "starts the dev server and tells the agent where the clone is" {
  export STUB_OUT="<promise>QA_COMPLETE</promise>"
  run "$REPO/ralph/ralph-qa.sh" https://example.com 1
  grep -qx -- "run dev" "$NPM_ARGS"
  grep -q -- "CLONE_URL: http://localhost:3015" "$STUB_STDIN"
  grep -q -- "@claude-in-chrome-reference.md" "$STUB_STDIN"
}

@test "invokes claude with the pinned model" {
  export STUB_OUT="<promise>QA_COMPLETE</promise>"
  run "$REPO/ralph/ralph-qa.sh" https://example.com 1
  [ "$status" -eq 0 ]
  grep -qx -- "--model" "$STUB_ARGS"
  grep -qx -- "claude-sonnet-5" "$STUB_ARGS"
}

@test "passes the target url through as QA's source of truth" {
  export STUB_OUT="<promise>QA_COMPLETE</promise>"
  run "$REPO/ralph/ralph-qa.sh" https://example.com 1
  grep -q "TARGET_URL: https://example.com" "$STUB_STDIN"
}

@test "omits the target-url context when no url is given" {
  export STUB_OUT="<promise>QA_COMPLETE</promise>"
  run "$REPO/ralph/ralph-qa.sh" "" 1
  [ "$status" -eq 0 ]
  ! grep -q "TARGET_URL:" "$STUB_STDIN"
  [[ "$output" == *"Target: none"* ]]
}

@test "treats the second argument as the iteration count" {
  export STUB_OUT="<promise>NEXT</promise>"
  run "$REPO/ralph/ralph-qa.sh" https://example.com 2
  [ "$status" -eq 0 ]
  [ "$(cat "$STUB_CALLS")" -eq 2 ]
  grep -q "ITERATION: 1 of 2" "$STUB_STDIN"
}

@test "runs the Playwright suite up front when e2e tests exist" {
  mkdir -p "$REPO/tests/e2e"
  export STUB_OUT="<promise>QA_COMPLETE</promise>"
  run "$REPO/ralph/ralph-qa.sh" https://example.com 1
  grep -q "playwright test" "$NPX_ARGS"
}

@test "a failing Playwright run does not abort the loop" {
  mkdir -p "$REPO/tests/e2e"
  export NPX_RC=1
  export STUB_OUT="<promise>QA_COMPLETE</promise>"
  run "$REPO/ralph/ralph-qa.sh" https://example.com 1
  [ "$status" -eq 0 ]
  [[ "$output" == *"QA agent will investigate"* ]]
}

@test "QA_COMPLETE runs a final regression and exits 0" {
  cover_features f1
  mkdir -p "$REPO/tests/e2e"
  export STUB_OUT="<promise>QA_COMPLETE</promise>"
  run "$REPO/ralph/ralph-qa.sh" https://example.com 5
  [ "$status" -eq 0 ]
  [[ "$output" == *"QA complete after 1 iterations"* ]]
  # once before the loop, once as the final regression
  [ "$(grep -c 'playwright test' "$NPX_ARGS")" -eq 2 ]
}

@test "aborts after MAX_FAILURES consecutive iterations with no promise" {
  export STUB_OUT="no promise"
  export RALPH_MAX_FAILURES=2
  export RALPH_RESUME_MAX=0
  run "$REPO/ralph/ralph-qa.sh" https://example.com 99
  [ "$status" -eq 1 ]
  [ "$(cat "$STUB_CALLS")" -eq 2 ]
  [[ "$output" == *"2 consecutive iterations produced no promise"* ]]
}




# ── the shared session runner, exercised through this phase ──────────────────

@test "a stranded QA session is resumed, and the pair writes ONE usage entry" {
  cover_features f1
  export STUB_OUT_1="I started the dev server in the background and am waiting"
  export STUB_OUT_2="<promise>QA_COMPLETE</promise>"
  run "$REPO/ralph/ralph-qa.sh" https://example.com 9
  [ "$status" -eq 0 ]
  [ "$(cat "$STUB_CALLS")" -eq 2 ]
  grep -qx -- "--resume" "$STUB_ARGS"
  [ "$(grep -c 'Session usage' "$PROGRESS_FILE")" -eq 1 ]
  grep -q 'resumed 1x' "$PROGRESS_FILE"
  # a resumed iteration still counts as one completed QA pass
  [ -f "$SENTINEL" ]
}

@test "QA sessions append to the same run-wide progress file as every other phase" {
  cover_features f1
  export STUB_OUT_1="<promise>NEXT</promise>"
  export STUB_OUT_2="<promise>QA_COMPLETE</promise>"
  run "$REPO/ralph/ralph-qa.sh" https://example.com 9
  [ "$(find "$RUN_DIR" -name 'progress*.txt' | wc -l)" -eq 1 ]
  [ "$(grep -c 'Session usage' "$PROGRESS_FILE")" -eq 2 ]
  grep -q "Phase 3 (QA) starting" "$PROGRESS_FILE"
  grep -q "Phase 3 (QA) reported QA_COMPLETE" "$PROGRESS_FILE"
}
