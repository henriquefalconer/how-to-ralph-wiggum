#!/usr/bin/env bats
# Tests for ralph-to-ralph.sh — the single entry point.
#
# It is a launcher: it clears a stale watchdog, creates the state namespaces,
# and hands the run to ralph-watchdog.sh (stubbed here) with the iteration
# budgets. The watchdog's restart logic is covered in ralph-watchdog.test.bats.
# Run with: npx bats ralph/ralph-to-ralph.test.bats

setup() {
  REPO="$BATS_TEST_TMPDIR/repo"
  mkdir -p "$REPO/ralph/.state" "$REPO/bin"
  cp "$BATS_TEST_DIRNAME/ralph-to-ralph.sh" "$REPO/ralph/"

  export WATCHDOG_ARGS="$REPO/watchdog-args.txt"
  cat > "$REPO/ralph/ralph-watchdog.sh" <<'STUB'
#!/bin/bash
printf '%s\n' "$@" >> "$WATCHDOG_ARGS"
exit "${WATCHDOG_RC:-0}"
STUB
  chmod +x "$REPO/ralph/ralph-watchdog.sh"

  printf '#!/bin/bash\nexit 0\n' > "$REPO/bin/sleep"
  chmod +x "$REPO/bin/sleep"
  PATH="$REPO/bin:$PATH"

  LOCKFILE="$REPO/ralph/.state/watchdog.lock"
}

@test "requires a target url" {
  run "$REPO/ralph/ralph-to-ralph.sh"
  [ "$status" -ne 0 ]
  [[ "$output" == *"Usage:"* ]]
}

@test "creates the run namespace and its single progress file before starting" {
  run "$REPO/ralph/ralph-to-ralph.sh" https://example.com
  [ "$status" -eq 0 ]
  RUN=$(find "$REPO/ralph/.state/runs" -mindepth 1 -maxdepth 1 -type d | head -1)
  [ -n "$RUN" ]
  [ -f "$RUN/progress.txt" ]
  # ONE progress file for the whole run, not one per phase
  [ "$(find "$REPO/ralph/.state/runs" -name 'progress*.txt' | wc -l)" -eq 1 ]
}

@test "exports one run id and progress path for every phase to inherit" {
  run "$REPO/ralph/ralph-to-ralph.sh" https://example.com
  [ "$status" -eq 0 ]
  [[ "$output" == *"Run id:"* ]]
  [[ "$output" == *"Progress:"* ]]
  [[ "$output" == *"tail -f"* ]]
  grep -q 'export RALPH_RUN_ID' "$BATS_TEST_DIRNAME/ralph-to-ralph.sh"
  grep -q 'export RALPH_PROGRESS' "$BATS_TEST_DIRNAME/ralph-to-ralph.sh"
}

@test "hands the target url to the watchdog" {
  run "$REPO/ralph/ralph-to-ralph.sh" https://example.com
  [ "$status" -eq 0 ]
  [ "$(sed -n 1p "$WATCHDOG_ARGS")" = "https://example.com" ]
}

@test "forwards the per-phase iteration budgets" {
  run "$REPO/ralph/ralph-to-ralph.sh" https://example.com 3 4 5
  [ "$status" -eq 0 ]
  [ "$(sed -n 2p "$WATCHDOG_ARGS")" = "3" ]
  [ "$(sed -n 3p "$WATCHDOG_ARGS")" = "4" ]
  [ "$(sed -n 4p "$WATCHDOG_ARGS")" = "5" ]
}

@test "defaults every phase budget to 999" {
  run "$REPO/ralph/ralph-to-ralph.sh" https://example.com
  [ "$(sed -n 2p "$WATCHDOG_ARGS")" = "999" ]
  [ "$(sed -n 3p "$WATCHDOG_ARGS")" = "999" ]
  [ "$(sed -n 4p "$WATCHDOG_ARGS")" = "999" ]
}

@test "echoes the budgets it is running with" {
  run "$REPO/ralph/ralph-to-ralph.sh" https://example.com 3 4 5
  [[ "$output" == *"Inspect iters:    3"* ]]
  [[ "$output" == *"Build iters:      4"* ]]
  [[ "$output" == *"QA iters:         5"* ]]
}

@test "clears a stale lockfile left by a dead process" {
  echo 999999 > "$LOCKFILE"
  run "$REPO/ralph/ralph-to-ralph.sh" https://example.com
  [ "$status" -eq 0 ]
  [ -f "$WATCHDOG_ARGS" ]
}

@test "stops a live watchdog before starting a new one" {
  # A real process we own, so kill -0 succeeds and the kill path is taken.
  # Not `sleep` — that is stubbed out to return immediately.
  tail -f /dev/null &
  local victim=$!
  echo "$victim" > "$LOCKFILE"

  run "$REPO/ralph/ralph-to-ralph.sh" https://example.com
  [ "$status" -eq 0 ]
  [[ "$output" == *"Stopping existing watchdog"* ]]
  [ ! -f "$LOCKFILE" ]
  [ -f "$WATCHDOG_ARGS" ]

  kill "$victim" 2>/dev/null || true
}

@test "runs cleanly when no lockfile exists" {
  [ ! -f "$LOCKFILE" ]
  run "$REPO/ralph/ralph-to-ralph.sh" https://example.com
  [ "$status" -eq 0 ]
  [[ "$output" != *"Stopping existing watchdog"* ]]
}

@test "surfaces a watchdog failure" {
  export WATCHDOG_RC=1
  run "$REPO/ralph/ralph-to-ralph.sh" https://example.com
  [ "$status" -ne 0 ]
}
