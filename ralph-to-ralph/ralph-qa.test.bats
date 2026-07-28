#!/usr/bin/env bats
# Tests for ralph-qa.sh (Phase 3 loop).
#
# `claude`, `npm` and `npx` are replaced by stubs. STUB_OUT / STUB_RC set
# the default claude response; STUB_OUT_<n> / STUB_RC_<n> override the nth call.
# Run with: npx bats ralph-to-ralph/ralph-qa.test.bats

setup() {
  REPO="$BATS_TEST_TMPDIR/repo"
  mkdir -p "$REPO/ralph-to-ralph/.state" "$REPO/bin"
  cp "$BATS_TEST_DIRNAME/ralph-qa.sh" "$REPO/ralph-to-ralph/"

  PROGRESS="$REPO/ralph-to-ralph/.state/progress/qa"
  LOGS="$REPO/ralph-to-ralph/.state/logs/qa"
  SENTINEL="$REPO/ralph-to-ralph/.state/qa-complete"

  export STUB_ARGS="$REPO/claude-args.txt"
  export STUB_CALLS="$REPO/claude-calls.txt"
  export NPM_ARGS="$REPO/npm-args.txt"
  export NPX_ARGS="$REPO/npx-args.txt"
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
  cat > "$REPO/bin/curl" <<'STUB'
#!/bin/bash
exit "${CURL_RC:-0}"
STUB
  chmod +x "$REPO/bin/curl"

  # setsid would put the stub in its own process group; not needed here, and it
  # is not installed everywhere. Run the command straight through.
  cat > "$REPO/bin/setsid" <<'STUB'
#!/bin/bash
exec "$@"
STUB
  chmod +x "$REPO/bin/setsid"

  printf '#!/bin/bash\nexit 0\n' > "$REPO/bin/pkill"
  chmod +x "$REPO/bin/pkill"

  # The script waits 5s for the dev server and backs off between retries.
  printf '#!/bin/bash\nexit 0\n' > "$REPO/bin/sleep"
  chmod +x "$REPO/bin/sleep"

  PATH="$REPO/bin:$PATH"

  echo '[{"id":"f1","passes":true}]' > "$REPO/prd.json"
}

@test "refuses to run without prd.json" {
  rm "$REPO/prd.json"
  run "$REPO/ralph-to-ralph/ralph-qa.sh" https://example.com 1
  [ "$status" -eq 1 ]
  [[ "$output" == *"prd.json not found"* ]]
}

@test "QA_COMPLETE writes the sentinel the watchdog treats as proof of a full pass" {
  export STUB_OUT="<promise>QA_COMPLETE</promise>"
  run "$REPO/ralph-to-ralph/ralph-qa.sh" https://example.com 1
  [ "$status" -eq 0 ]
  [ -f "$SENTINEL" ]
}

@test "running out of iterations leaves no sentinel" {
  export STUB_OUT="<promise>NEXT</promise>"
  run "$REPO/ralph-to-ralph/ralph-qa.sh" https://example.com 2
  [ ! -f "$SENTINEL" ]
}

@test "clears a stale sentinel even when it exits before QA starts" {
  # The sentinel is the watchdog's only evidence that QA actually ran. Every
  # early exit must therefore invalidate the previous cycle's sentinel first —
  # otherwise the watchdog reads last cycle's verdict as this cycle's.
  echo "stale verdict from an earlier cycle" > "$SENTINEL"
  rm "$REPO/prd.json"
  run "$REPO/ralph-to-ralph/ralph-qa.sh" https://example.com 1
  [ "$status" -eq 1 ]
  [ ! -f "$SENTINEL" ]
}

@test "clears a stale sentinel when the dev server never comes up" {
  echo "stale verdict from an earlier cycle" > "$SENTINEL"
  export CURL_RC=1
  run "$REPO/ralph-to-ralph/ralph-qa.sh" https://example.com 1
  [ "$status" -eq 1 ]
  [[ "$output" == *"never became ready"* ]]
  [ ! -f "$SENTINEL" ]
}

@test "seeds report-qa.json when missing" {
  export STUB_OUT="<promise>QA_COMPLETE</promise>"
  run "$REPO/ralph-to-ralph/ralph-qa.sh" https://example.com 1
  [ "$status" -eq 0 ]
  [ "$(cat "$REPO/report-qa.json")" = "[]" ]
}

@test "starts the dev server and tells the agent where the clone is" {
  export STUB_OUT="<promise>QA_COMPLETE</promise>"
  run "$REPO/ralph-to-ralph/ralph-qa.sh" https://example.com 1
  grep -qx -- "run dev" "$NPM_ARGS"
  grep -q -- "CLONE_URL: http://localhost:3015" "$STUB_ARGS"
  grep -q -- "@claude-in-chrome-reference.md" "$STUB_ARGS"
}

@test "invokes claude with the pinned model" {
  export STUB_OUT="<promise>QA_COMPLETE</promise>"
  run "$REPO/ralph-to-ralph/ralph-qa.sh" https://example.com 1
  [ "$status" -eq 0 ]
  grep -qx -- "--model" "$STUB_ARGS"
  grep -qx -- "claude-sonnet-5" "$STUB_ARGS"
}

@test "passes the target url through as QA's source of truth" {
  export STUB_OUT="<promise>QA_COMPLETE</promise>"
  run "$REPO/ralph-to-ralph/ralph-qa.sh" https://example.com 1
  grep -q "TARGET_URL: https://example.com" "$STUB_ARGS"
}

@test "omits the target-url context when no url is given" {
  export STUB_OUT="<promise>QA_COMPLETE</promise>"
  run "$REPO/ralph-to-ralph/ralph-qa.sh" "" 1
  [ "$status" -eq 0 ]
  ! grep -q "TARGET_URL:" "$STUB_ARGS"
  [[ "$output" == *"Target: none"* ]]
}

@test "treats the second argument as the iteration count" {
  export STUB_OUT="<promise>NEXT</promise>"
  run "$REPO/ralph-to-ralph/ralph-qa.sh" https://example.com 2
  [ "$status" -eq 0 ]
  [ "$(cat "$STUB_CALLS")" -eq 2 ]
  grep -q "ITERATION: 1 of 2" "$STUB_ARGS"
}

@test "runs the Playwright suite up front when e2e tests exist" {
  mkdir -p "$REPO/tests/e2e"
  export STUB_OUT="<promise>QA_COMPLETE</promise>"
  run "$REPO/ralph-to-ralph/ralph-qa.sh" https://example.com 1
  grep -q "playwright test" "$NPX_ARGS"
}

@test "a failing Playwright run does not abort the loop" {
  mkdir -p "$REPO/tests/e2e"
  export NPX_RC=1
  export STUB_OUT="<promise>QA_COMPLETE</promise>"
  run "$REPO/ralph-to-ralph/ralph-qa.sh" https://example.com 1
  [ "$status" -eq 0 ]
  [[ "$output" == *"QA agent will investigate"* ]]
}

@test "QA_COMPLETE runs a final regression and exits 0" {
  mkdir -p "$REPO/tests/e2e"
  export STUB_OUT="<promise>QA_COMPLETE</promise>"
  run "$REPO/ralph-to-ralph/ralph-qa.sh" https://example.com 5
  [ "$status" -eq 0 ]
  [[ "$output" == *"QA complete after 1 iterations"* ]]
  # once before the loop, once as the final regression
  [ "$(grep -c 'playwright test' "$NPX_ARGS")" -eq 2 ]
}

@test "aborts after MAX_FAILURES consecutive iterations with no promise" {
  export STUB_OUT="no promise"
  export RALPH_MAX_FAILURES=2
  run "$REPO/ralph-to-ralph/ralph-qa.sh" https://example.com 99
  [ "$status" -eq 1 ]
  [ "$(cat "$STUB_CALLS")" -eq 2 ]
  [[ "$output" == *"2 consecutive iterations produced no promise"* ]]
}

@test "tees each iteration to its own transcript under the qa log namespace" {
  export STUB_OUT="<promise>QA_COMPLETE</promise>"
  run "$REPO/ralph-to-ralph/ralph-qa.sh" https://example.com 1
  [ -f "$LOGS/001.log" ]
  grep -qF "<promise>QA_COMPLETE</promise>" "$LOGS/001.log"
}

@test "names a fresh per-iteration progress file each time" {
  export STUB_OUT_1="<promise>NEXT</promise>"
  export STUB_OUT_2="<promise>QA_COMPLETE</promise>"
  run "$REPO/ralph-to-ralph/ralph-qa.sh" https://example.com 9
  grep -q "PROGRESS_FILE: ralph-to-ralph/.state/progress/qa/001.md" "$STUB_ARGS"
  grep -q "PROGRESS_FILE: ralph-to-ralph/.state/progress/qa/002.md" "$STUB_ARGS"
}

@test "feeds back only the five most recent progress files" {
  mkdir -p "$PROGRESS"
  for n in 001 002 003 004 005 006 007; do echo "note $n" > "$PROGRESS/$n.md"; done
  export STUB_OUT="<promise>QA_COMPLETE</promise>"
  run "$REPO/ralph-to-ralph/ralph-qa.sh" https://example.com 1
  [ "$status" -eq 0 ]
  ! grep -q "progress/qa/001.md" "$STUB_ARGS"
  grep -q -- "@ralph-to-ralph/.state/progress/qa/003.md" "$STUB_ARGS"
  grep -q -- "@ralph-to-ralph/.state/progress/qa/007.md" "$STUB_ARGS"
}
