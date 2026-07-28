#!/usr/bin/env bats
# Tests for ralph-build.sh (Phase 2 loop).
#
# `claude` is replaced by a stub each test drives: STUB_OUT / STUB_RC set the
# default response, STUB_OUT_<n> / STUB_RC_<n> override the nth invocation.
# Run with: npx bats ralph-to-ralph/ralph-build.test.bats

setup() {
  REPO="$BATS_TEST_TMPDIR/repo"
  mkdir -p "$REPO/ralph-to-ralph" "$REPO/bin"
  cp "$BATS_TEST_DIRNAME/ralph-build.sh" "$REPO/ralph-to-ralph/"

  PROGRESS="$REPO/ralph-to-ralph/.state/progress/build"
  LOGS="$REPO/ralph-to-ralph/.state/logs/build"

  export STUB_ARGS="$REPO/claude-args.txt"
  export STUB_CALLS="$REPO/claude-calls.txt"
  echo 0 > "$STUB_CALLS"

  cat > "$REPO/bin/claude" <<'STUB'
#!/bin/bash
printf '%s\n' "$@" >> "$STUB_ARGS"
n=$(( $(cat "$STUB_CALLS") + 1 )); echo "$n" > "$STUB_CALLS"
out="STUB_OUT_$n"; rc="STUB_RC_$n"
echo "${!out:-${STUB_OUT:-}}"
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
  run "$REPO/ralph-to-ralph/ralph-build.sh" 1
  [ "$status" -eq 1 ]
  [[ "$output" == *"prd.json not found"* ]]
}

@test "refuses to run on a corrupt prd.json instead of reading it as 0 features" {
  echo '[{"id":"f1","passes":fals' > "$REPO/prd.json"
  run "$REPO/ralph-to-ralph/ralph-build.sh" 5
  [ "$status" -eq 1 ]
  [[ "$output" == *"cannot parse prd.json"* ]]
  [ "$(cat "$STUB_CALLS")" -eq 0 ]
}

@test "refuses to run when prd.json is valid JSON but not a list" {
  echo '{"id":"f1"}' > "$REPO/prd.json"
  run "$REPO/ralph-to-ralph/ralph-build.sh" 5
  [ "$status" -eq 1 ]
  [[ "$output" == *"not a JSON list"* ]]
  [ "$(cat "$STUB_CALLS")" -eq 0 ]
}

@test "refuses to run without spec-build.md" {
  rm "$REPO/spec-build.md"
  run "$REPO/ralph-to-ralph/ralph-build.sh" 1
  [ "$status" -eq 1 ]
  [[ "$output" == *"spec-build.md not found"* ]]
}

@test "exits 0 without calling claude when every feature already passes" {
  echo '[{"id":"f1","passes":true}]' > "$REPO/prd.json"
  run "$REPO/ralph-to-ralph/ralph-build.sh" 5
  [ "$status" -eq 0 ]
  [[ "$output" == *"All 1 features already pass"* ]]
  [ "$(cat "$STUB_CALLS")" -eq 0 ]
}

@test "invokes claude with the pinned model" {
  export STUB_OUT="<promise>COMPLETE</promise>"
  run "$REPO/ralph-to-ralph/ralph-build.sh" 1
  [ "$status" -eq 0 ]
  grep -qx -- "--model" "$STUB_ARGS"
  grep -qx -- "claude-opus-4-8" "$STUB_ARGS"
}

@test "NEXT continues, COMPLETE ends the loop" {
  export STUB_OUT_1="<promise>NEXT</promise>"
  export STUB_OUT_2="<promise>COMPLETE</promise>"
  run "$REPO/ralph-to-ralph/ralph-build.sh" 9
  [ "$status" -eq 0 ]
  [ "$(cat "$STUB_CALLS")" -eq 2 ]
  [[ "$output" == *"Build complete after 2 iterations"* ]]
}

@test "aborts after MAX_FAILURES consecutive iterations with no promise" {
  export STUB_OUT="thinking out loud, but no promise"
  export RALPH_MAX_FAILURES=2
  run "$REPO/ralph-to-ralph/ralph-build.sh" 99
  [ "$status" -eq 1 ]
  [ "$(cat "$STUB_CALLS")" -eq 2 ]
  [[ "$output" == *"2 consecutive iterations produced no promise"* ]]
}

@test "a crashing claude is reported by exit code instead of killing the loop" {
  export STUB_OUT="boom"
  export STUB_RC=7
  export RALPH_MAX_FAILURES=2
  run "$REPO/ralph-to-ralph/ralph-build.sh" 99
  [ "$status" -eq 1 ]
  [ "$(cat "$STUB_CALLS")" -eq 2 ]
  [[ "$output" == *"claude exited 7"* ]]
}

@test "a clean exit with no promise is diagnosed differently from a crash" {
  export STUB_OUT="no promise here"
  export RALPH_MAX_FAILURES=1
  run "$REPO/ralph-to-ralph/ralph-build.sh" 99
  [ "$status" -eq 1 ]
  [[ "$output" == *"exited cleanly but emitted no promise"* ]]
}

@test "a promise resets the consecutive-failure counter" {
  export STUB_OUT_1="nothing"
  export STUB_OUT_2="<promise>NEXT</promise>"
  export STUB_OUT_3="nothing"
  export STUB_OUT_4="<promise>COMPLETE</promise>"
  export RALPH_MAX_FAILURES=2
  run "$REPO/ralph-to-ralph/ralph-build.sh" 99
  [ "$status" -eq 0 ]
  [ "$(cat "$STUB_CALLS")" -eq 4 ]
}

@test "tees each iteration to its own transcript under the build log namespace" {
  export STUB_OUT_1="<promise>NEXT</promise>"
  export STUB_OUT_2="<promise>COMPLETE</promise>"
  run "$REPO/ralph-to-ralph/ralph-build.sh" 9
  [ -f "$LOGS/001.log" ]
  [ -f "$LOGS/002.log" ]
  grep -qF "<promise>NEXT</promise>" "$LOGS/001.log"
  grep -qF "<promise>COMPLETE</promise>" "$LOGS/002.log"
}

@test "the transcript is echoed to stdout as well as the log" {
  export STUB_OUT="<promise>COMPLETE</promise>"
  run "$REPO/ralph-to-ralph/ralph-build.sh" 1
  [[ "$output" == *"<promise>COMPLETE</promise>"* ]]
}

@test "names a fresh per-iteration progress file each time" {
  export STUB_OUT_1="<promise>NEXT</promise>"
  export STUB_OUT_2="<promise>COMPLETE</promise>"
  run "$REPO/ralph-to-ralph/ralph-build.sh" 9
  grep -q "PROGRESS_FILE: ralph-to-ralph/.state/progress/build/001.md" "$STUB_ARGS"
  grep -q "PROGRESS_FILE: ralph-to-ralph/.state/progress/build/002.md" "$STUB_ARGS"
}

@test "survives an empty progress dir on the first iteration" {
  # ls over an empty dir exits non-zero; under pipefail that would be fatal
  export STUB_OUT="<promise>COMPLETE</promise>"
  run "$REPO/ralph-to-ralph/ralph-build.sh" 1
  [ "$status" -eq 0 ]
}

@test "feeds back only the five most recent progress files" {
  mkdir -p "$PROGRESS"
  for n in 001 002 003 004 005 006 007; do echo "note $n" > "$PROGRESS/$n.md"; done
  export STUB_OUT="<promise>COMPLETE</promise>"
  run "$REPO/ralph-to-ralph/ralph-build.sh" 1
  [ "$status" -eq 0 ]
  # oldest two dropped, newest five kept — bounded regardless of run length
  ! grep -q "progress/build/001.md" "$STUB_ARGS"
  ! grep -q "progress/build/002.md" "$STUB_ARGS"
  grep -q -- "@ralph-to-ralph/.state/progress/build/003.md" "$STUB_ARGS"
  grep -q -- "@ralph-to-ralph/.state/progress/build/007.md" "$STUB_ARGS"
}

@test "older progress files stay on disk after dropping out of the prompt" {
  mkdir -p "$PROGRESS"
  for n in 001 002 003 004 005 006 007; do echo "note $n" > "$PROGRESS/$n.md"; done
  export STUB_OUT="<promise>COMPLETE</promise>"
  run "$REPO/ralph-to-ralph/ralph-build.sh" 1
  [ -f "$PROGRESS/001.md" ]
  [ "$(cat "$PROGRESS/001.md")" = "note 001" ]
}

@test "passes the iteration count and pass tally into the prompt" {
  export STUB_OUT="<promise>COMPLETE</promise>"
  run "$REPO/ralph-to-ralph/ralph-build.sh" 4
  grep -q "ITERATION: 1 of 4" "$STUB_ARGS"
  grep -q "PROGRESS: 0/1 features passed" "$STUB_ARGS"
}
