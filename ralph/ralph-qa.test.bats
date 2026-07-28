setup() {
  REPO="$BATS_TEST_TMPDIR/repo"
  mkdir -p "$REPO/ralph/.state" "$REPO/bin"
  cp "$BATS_TEST_DIRNAME/ralph-qa.sh" "$BATS_TEST_DIRNAME/ralph-lib.sh" "$BATS_TEST_DIRNAME/ralph-resume.sh" "$REPO/ralph/"

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

@test "refuses to run without prd.json" {
  rm "$REPO/prd.json"
  run "$REPO/ralph/ralph-qa.sh" https://example.com 1
  [ "$status" -eq 1 ]
  [[ "$output" == *"prd.json not found"* ]]
}

@test "QA_COMPLETE writes the sentinel the watchdog treats as proof of a full pass" {
  export STUB_OUT="<promise>QA_COMPLETE</promise>"
  run "$REPO/ralph/ralph-qa.sh" https://example.com 1
  [ "$status" -eq 0 ]
  [ -f "$SENTINEL" ]
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
  [[ "$output" == *"never became ready"* ]]
  [ ! -f "$SENTINEL" ]
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
  export STUB_OUT_1="<promise>NEXT</promise>"
  export STUB_OUT_2="<promise>QA_COMPLETE</promise>"
  run "$REPO/ralph/ralph-qa.sh" https://example.com 9
  [ "$(find "$RUN_DIR" -name 'progress*.txt' | wc -l)" -eq 1 ]
  [ "$(grep -c 'Session usage' "$PROGRESS_FILE")" -eq 2 ]
  grep -q "Phase 3 (QA) starting" "$PROGRESS_FILE"
  grep -q "Phase 3 (QA) reported QA_COMPLETE" "$PROGRESS_FILE"
}
