#!/usr/bin/env bats
# Tests for ralph-inspect.sh (Phase 1 loop).
#
# `claude` and `ever` are replaced by stubs. STUB_OUT / STUB_RC set the default
# claude response; STUB_OUT_<n> / STUB_RC_<n> override the nth invocation.
# Run with: npx bats ralph_to_ralph/ralph-inspect.test.bats

setup() {
  REPO="$BATS_TEST_TMPDIR/repo"
  mkdir -p "$REPO/ralph_to_ralph" "$REPO/bin"
  cp "$BATS_TEST_DIRNAME/ralph-inspect.sh" "$REPO/ralph_to_ralph/"

  PROGRESS="$REPO/ralph_to_ralph/.state/progress/inspect"
  LOGS="$REPO/ralph_to_ralph/.state/logs/inspect"

  export STUB_ARGS="$REPO/claude-args.txt"
  export STUB_CALLS="$REPO/claude-calls.txt"
  export EVER_ARGS="$REPO/ever-args.txt"
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

  cat > "$REPO/bin/ever" <<'STUB'
#!/bin/bash
printf '%s\n' "$*" >> "$EVER_ARGS"
exit "${EVER_RC:-0}"
STUB
  chmod +x "$REPO/bin/ever"

  printf '#!/bin/bash\nexit 0\n' > "$REPO/bin/sleep"
  chmod +x "$REPO/bin/sleep"

  PATH="$REPO/bin:$PATH"
}

@test "requires a target url" {
  run "$REPO/ralph_to_ralph/ralph-inspect.sh"
  [ "$status" -ne 0 ]
  [[ "$output" == *"Usage:"* ]]
}

@test "seeds prd.json and the state namespaces on first run" {
  export STUB_OUT="<promise>INSPECT_COMPLETE</promise>"
  run "$REPO/ralph_to_ralph/ralph-inspect.sh" https://example.com 1
  [ "$status" -eq 0 ]
  [ "$(cat "$REPO/prd.json")" = "[]" ]
  [ -d "$PROGRESS" ]
  [ -d "$LOGS" ]
  [ -d "$REPO/screenshots" ]
}

@test "opens an Ever session on the target url and stops it on exit" {
  export STUB_OUT="<promise>INSPECT_COMPLETE</promise>"
  run "$REPO/ralph_to_ralph/ralph-inspect.sh" https://example.com 1
  [ "$status" -eq 0 ]
  grep -qx -- "start --url https://example.com" "$EVER_ARGS"
  grep -qx -- "stop" "$EVER_ARGS"
}

@test "invokes claude with the pinned model" {
  export STUB_OUT="<promise>INSPECT_COMPLETE</promise>"
  run "$REPO/ralph_to_ralph/ralph-inspect.sh" https://example.com 1
  [ "$status" -eq 0 ]
  grep -qx -- "--model" "$STUB_ARGS"
  grep -qx -- "claude-opus-4-8" "$STUB_ARGS"
}

@test "passes the target url and iteration into the prompt" {
  export STUB_OUT="<promise>INSPECT_COMPLETE</promise>"
  run "$REPO/ralph_to_ralph/ralph-inspect.sh" https://example.com 7
  grep -q "TARGET URL: https://example.com" "$STUB_ARGS"
  grep -q "ITERATION: 1 of 7" "$STUB_ARGS"
}

@test "INSPECT_COMPLETE writes the sentinel the watchdog polls for" {
  export STUB_OUT="<promise>INSPECT_COMPLETE</promise>"
  run "$REPO/ralph_to_ralph/ralph-inspect.sh" https://example.com 3
  [ "$status" -eq 0 ]
  [ -f "$REPO/ralph_to_ralph/.state/inspect-complete" ]
  [ "$(cat "$STUB_CALLS")" -eq 1 ]
}

@test "NEXT keeps iterating and leaves no sentinel when the budget runs out" {
  export STUB_OUT="<promise>NEXT</promise>"
  run "$REPO/ralph_to_ralph/ralph-inspect.sh" https://example.com 3
  [ "$status" -eq 0 ]
  [ "$(cat "$STUB_CALLS")" -eq 3 ]
  [ ! -f "$REPO/ralph_to_ralph/.state/inspect-complete" ]
  [[ "$output" == *"may be incomplete"* ]]
}

@test "NEXT then INSPECT_COMPLETE stops at the completing iteration" {
  export STUB_OUT_1="<promise>NEXT</promise>"
  export STUB_OUT_2="<promise>INSPECT_COMPLETE</promise>"
  run "$REPO/ralph_to_ralph/ralph-inspect.sh" https://example.com 9
  [ "$status" -eq 0 ]
  [ "$(cat "$STUB_CALLS")" -eq 2 ]
  [[ "$output" == *"complete after 2 iterations"* ]]
}

@test "aborts after MAX_FAILURES consecutive iterations with no promise" {
  export STUB_OUT="no promise in here"
  export RALPH_MAX_FAILURES=2
  run "$REPO/ralph_to_ralph/ralph-inspect.sh" https://example.com 99
  [ "$status" -eq 1 ]
  [ "$(cat "$STUB_CALLS")" -eq 2 ]
  [[ "$output" == *"2 consecutive iterations produced no promise"* ]]
}

@test "a timeout is diagnosed as a timeout" {
  export STUB_OUT="hung"
  export STUB_RC=124
  export RALPH_MAX_FAILURES=1
  run "$REPO/ralph_to_ralph/ralph-inspect.sh" https://example.com 99
  [ "$status" -eq 1 ]
  [[ "$output" == *"hit the 1200s timeout"* ]]
}

@test "tees each iteration to its own transcript under the inspect log namespace" {
  export STUB_OUT="<promise>INSPECT_COMPLETE</promise>"
  run "$REPO/ralph_to_ralph/ralph-inspect.sh" https://example.com 1
  [ -f "$LOGS/001.log" ]
  grep -qF "<promise>INSPECT_COMPLETE</promise>" "$LOGS/001.log"
}

@test "names a fresh per-iteration progress file each time" {
  export STUB_OUT_1="<promise>NEXT</promise>"
  export STUB_OUT_2="<promise>INSPECT_COMPLETE</promise>"
  run "$REPO/ralph_to_ralph/ralph-inspect.sh" https://example.com 9
  grep -q "PROGRESS_FILE: ralph_to_ralph/.state/progress/inspect/001.md" "$STUB_ARGS"
  grep -q "PROGRESS_FILE: ralph_to_ralph/.state/progress/inspect/002.md" "$STUB_ARGS"
}

@test "feeds back only the five most recent progress files" {
  mkdir -p "$PROGRESS"
  for n in 001 002 003 004 005 006 007; do echo "note $n" > "$PROGRESS/$n.md"; done
  export STUB_OUT="<promise>INSPECT_COMPLETE</promise>"
  run "$REPO/ralph_to_ralph/ralph-inspect.sh" https://example.com 1
  [ "$status" -eq 0 ]
  ! grep -q "progress/inspect/001.md" "$STUB_ARGS"
  grep -q -- "@ralph_to_ralph/.state/progress/inspect/003.md" "$STUB_ARGS"
  grep -q -- "@ralph_to_ralph/.state/progress/inspect/007.md" "$STUB_ARGS"
}
