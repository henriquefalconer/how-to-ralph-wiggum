#!/usr/bin/env bats
# Tests for ralph-build.sh (Phase 2 loop).
#
# `claude` is replaced by a stub each test drives: STUB_OUT / STUB_RC set the
# default response, STUB_OUT_<n> / STUB_RC_<n> override the nth invocation.
# Run with: npx bats ralph/ralph-build.test.bats

setup() {
  REPO="$BATS_TEST_TMPDIR/repo"
  mkdir -p "$REPO/ralph/.state" "$REPO/bin"
  cp "$BATS_TEST_DIRNAME/ralph-build.sh" "$BATS_TEST_DIRNAME/ralph-lib.sh" "$BATS_TEST_DIRNAME/ralph-resume.sh" "$REPO/ralph/"

  export RALPH_RUN_ID="TESTRUN"
  RUN_DIR="$REPO/ralph/.state/runs/TESTRUN"
  PROGRESS_FILE="$RUN_DIR/progress.txt"

  export STUB_ARGS="$REPO/claude-args.txt"      # argv, one word per line
  export STUB_STDIN="$REPO/claude-stdin.txt"    # the assembled prompt
  export STUB_CALLS="$REPO/claude-calls.txt"
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
[ -n "${STUB_PRD_TRUNCATE:-}" ] && echo '[]' > prd.json
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

  # Keep the retry backoff from actually sleeping.
  printf '#!/bin/bash\nexit 0\n' > "$REPO/bin/sleep"
  chmod +x "$REPO/bin/sleep"

  PATH="$REPO/bin:$PATH"

  # Fixture: one unbuilt feature, spec present.
  echo '[{"id":"f1","passes":false}]' > "$REPO/prd.json"
  echo '# build spec' > "$REPO/spec-build.md"
}

@test "refuses to run without prd.json" {
  rm "$REPO/prd.json"
  run "$REPO/ralph/ralph-build.sh" 1
  [ "$status" -eq 1 ]
  [[ "$output" == *"prd.json not found"* ]]
}

@test "refuses to run on a corrupt prd.json instead of reading it as 0 features" {
  echo '[{"id":"f1","passes":fals' > "$REPO/prd.json"
  run "$REPO/ralph/ralph-build.sh" 5
  [ "$status" -eq 1 ]
  [[ "$output" == *"cannot parse prd.json"* ]]
  [ "$(cat "$STUB_CALLS")" -eq 0 ]
}

@test "refuses to run on an empty prd.json instead of invoking an agent with nothing to build" {
  echo '[]' > "$REPO/prd.json"
  run "$REPO/ralph/ralph-build.sh" 5
  [ "$status" -eq 1 ]
  [[ "$output" == *"contains no features"* ]]
  [ "$(cat "$STUB_CALLS")" -eq 0 ]
}

@test "aborts if the agent truncates prd.json to an empty list mid-run" {
  export STUB_OUT="<promise>NEXT</promise>"
  export STUB_PRD_TRUNCATE=1
  export RALPH_RESUME_MAX=0
  run "$REPO/ralph/ralph-build.sh" 9
  [ "$status" -eq 1 ]
  [[ "$output" == *"contains no features"* ]]
  [ "$(cat "$STUB_CALLS")" -eq 1 ]
}

@test "refuses to run when prd.json is valid JSON but not a list" {
  echo '{"id":"f1"}' > "$REPO/prd.json"
  run "$REPO/ralph/ralph-build.sh" 5
  [ "$status" -eq 1 ]
  [[ "$output" == *"not a JSON list"* ]]
  [ "$(cat "$STUB_CALLS")" -eq 0 ]
}

@test "refuses to run without spec-build.md" {
  rm "$REPO/spec-build.md"
  run "$REPO/ralph/ralph-build.sh" 1
  [ "$status" -eq 1 ]
  [[ "$output" == *"spec-build.md not found"* ]]
}

@test "exits 0 without calling claude when every feature already passes" {
  echo '[{"id":"f1","passes":true}]' > "$REPO/prd.json"
  run "$REPO/ralph/ralph-build.sh" 5
  [ "$status" -eq 0 ]
  [[ "$output" == *"All 1 features already pass"* ]]
  [ "$(cat "$STUB_CALLS")" -eq 0 ]
}

@test "invokes claude with the pinned model" {
  export STUB_OUT="<promise>COMPLETE</promise>"
  run "$REPO/ralph/ralph-build.sh" 1
  [ "$status" -eq 0 ]
  grep -qx -- "--model" "$STUB_ARGS"
  grep -qx -- "claude-sonnet-5" "$STUB_ARGS"
}

@test "NEXT continues, COMPLETE ends the loop" {
  export STUB_OUT_1="<promise>NEXT</promise>"
  export STUB_OUT_2="<promise>COMPLETE</promise>"
  run "$REPO/ralph/ralph-build.sh" 9
  [ "$status" -eq 0 ]
  [ "$(cat "$STUB_CALLS")" -eq 2 ]
  [[ "$output" == *"Build complete after 2 iterations"* ]]
}

@test "aborts after MAX_FAILURES consecutive iterations with no promise" {
  export STUB_OUT="thinking out loud, but no promise"
  export RALPH_MAX_FAILURES=2
  export RALPH_RESUME_MAX=0
  run "$REPO/ralph/ralph-build.sh" 99
  [ "$status" -eq 1 ]
  [ "$(cat "$STUB_CALLS")" -eq 2 ]
  [[ "$output" == *"2 consecutive iterations produced no promise"* ]]
}

@test "a crashing claude does not kill the loop" {
  export STUB_OUT="boom"
  export STUB_RC=7
  export STUB_ERR=1          # a CLI-level failure is not resumable
  export RALPH_MAX_FAILURES=2
  run "$REPO/ralph/ralph-build.sh" 99
  [ "$status" -eq 1 ]
  [ "$(cat "$STUB_CALLS")" -eq 2 ]
  [[ "$output" == *"2 consecutive iterations produced no promise"* ]]
}

@test "a clean exit with no promise is resumed first, then reported" {
  export STUB_OUT="no promise here"
  export RALPH_MAX_FAILURES=1
  export RALPH_RESUME_MAX=1
  run "$REPO/ralph/ralph-build.sh" 99
  [ "$status" -eq 1 ]
  [[ "$output" == *"no promise after 1 resume(s)"* ]]
}

@test "a promise resets the consecutive-failure counter" {
  export STUB_OUT_1="nothing"
  export STUB_OUT_2="<promise>NEXT</promise>"
  export STUB_OUT_3="nothing"
  export STUB_OUT_4="<promise>COMPLETE</promise>"
  export RALPH_MAX_FAILURES=2
  export RALPH_RESUME_MAX=0
  run "$REPO/ralph/ralph-build.sh" 99
  [ "$status" -eq 0 ]
  [ "$(cat "$STUB_CALLS")" -eq 4 ]
}







@test "passes the iteration count and pass tally into the prompt" {
  export STUB_OUT="<promise>COMPLETE</promise>"
  run "$REPO/ralph/ralph-build.sh" 4
  grep -q "ITERATION: 1 of 4" "$STUB_STDIN"
  grep -q "PROGRESS_COUNT: 0/1 features passed" "$STUB_STDIN"
  grep -q "PROGRESS: .*runs/TESTRUN/progress.txt" "$STUB_STDIN"
}

# ── the shared session runner, exercised through this phase ──────────────────

@test "a stranded build session is resumed, and the pair writes ONE usage entry" {
  export STUB_OUT_1="I backgrounded the test run and am waiting on it"
  export STUB_OUT_2="<promise>COMPLETE</promise>"
  run "$REPO/ralph/ralph-build.sh" 9
  [ "$status" -eq 0 ]
  [ "$(cat "$STUB_CALLS")" -eq 2 ]
  grep -qx -- "--resume" "$STUB_ARGS"
  [ "$(grep -c 'Session usage' "$PROGRESS_FILE")" -eq 1 ]
  grep -q 'resumed 1x' "$PROGRESS_FILE"
  grep -qF -- 'cost $1.0000' "$PROGRESS_FILE"
}

@test "build sessions append to the same run-wide progress file as every other phase" {
  export STUB_OUT_1="<promise>NEXT</promise>"
  export STUB_OUT_2="<promise>COMPLETE</promise>"
  run "$REPO/ralph/ralph-build.sh" 9
  [ "$(find "$RUN_DIR" -name 'progress*.txt' | wc -l)" -eq 1 ]
  [ "$(grep -c 'Session usage' "$PROGRESS_FILE")" -eq 2 ]
  grep -q "Phase 2 (Build) starting" "$PROGRESS_FILE"
  grep -q "Phase 2 (Build) reported COMPLETE" "$PROGRESS_FILE"
}

@test "the ledger reports context, models and the transcript path" {
  export STUB_OUT="<promise>COMPLETE</promise>"
  run "$REPO/ralph/ralph-build.sh" 1
  grep -q -- '- context .* tok peak of 1M .* inference calls' "$PROGRESS_FILE"
  grep -q -- '- models sonnet-5 \$0.5000' "$PROGRESS_FILE"
  grep -qF -- '- transcript: ralph/.state/runs/TESTRUN/001-build-1.json' "$PROGRESS_FILE"
}
