#!/usr/bin/env bats
# Tests for ralph-to-ralph.sh — the single entry point.
#
# It is a launcher: it clears a stale watchdog, creates the state namespaces,
# and hands the run to ralph-watchdog.sh (stubbed here) with the iteration
# budgets. The watchdog's restart logic is covered in ralph-watchdog.test.bats.
# Run with: npx bats ralph-to-ralph/ralph-to-ralph.test.bats

setup() {
  REPO="$BATS_TEST_TMPDIR/repo"
  mkdir -p "$REPO/ralph-to-ralph/.state" "$REPO/bin"
  cp "$BATS_TEST_DIRNAME/ralph-to-ralph.sh" "$REPO/ralph-to-ralph/"

  export WATCHDOG_ARGS="$REPO/watchdog-args.txt"
  cat > "$REPO/ralph-to-ralph/ralph-watchdog.sh" <<'STUB'
#!/bin/bash
printf '%s\n' "$@" >> "$WATCHDOG_ARGS"
exit "${WATCHDOG_RC:-0}"
STUB
  chmod +x "$REPO/ralph-to-ralph/ralph-watchdog.sh"

  printf '#!/bin/bash\nexit 0\n' > "$REPO/bin/sleep"
  chmod +x "$REPO/bin/sleep"
  PATH="$REPO/bin:$PATH"

  LOCKFILE="$REPO/ralph-to-ralph/.state/watchdog.lock"
}

@test "requires a target url" {
  run "$REPO/ralph-to-ralph/ralph-to-ralph.sh"
  [ "$status" -ne 0 ]
  [[ "$output" == *"Usage:"* ]]
}

@test "creates the per-phase state namespaces before starting" {
  run "$REPO/ralph-to-ralph/ralph-to-ralph.sh" https://example.com
  [ "$status" -eq 0 ]
  for phase in inspect build qa; do
    [ -d "$REPO/ralph-to-ralph/.state/progress/$phase" ]
    [ -d "$REPO/ralph-to-ralph/.state/logs/$phase" ]
  done
}

@test "hands the target url to the watchdog" {
  run "$REPO/ralph-to-ralph/ralph-to-ralph.sh" https://example.com
  [ "$status" -eq 0 ]
  [ "$(sed -n 1p "$WATCHDOG_ARGS")" = "https://example.com" ]
}

@test "forwards the per-phase iteration budgets" {
  run "$REPO/ralph-to-ralph/ralph-to-ralph.sh" https://example.com 3 4 5
  [ "$status" -eq 0 ]
  [ "$(sed -n 2p "$WATCHDOG_ARGS")" = "3" ]
  [ "$(sed -n 3p "$WATCHDOG_ARGS")" = "4" ]
  [ "$(sed -n 4p "$WATCHDOG_ARGS")" = "5" ]
}

@test "defaults every phase budget to 999" {
  run "$REPO/ralph-to-ralph/ralph-to-ralph.sh" https://example.com
  [ "$(sed -n 2p "$WATCHDOG_ARGS")" = "999" ]
  [ "$(sed -n 3p "$WATCHDOG_ARGS")" = "999" ]
  [ "$(sed -n 4p "$WATCHDOG_ARGS")" = "999" ]
}

@test "echoes the budgets it is running with" {
  run "$REPO/ralph-to-ralph/ralph-to-ralph.sh" https://example.com 3 4 5
  [[ "$output" == *"Inspect iters:    3"* ]]
  [[ "$output" == *"Build iters:      4"* ]]
  [[ "$output" == *"QA iters:         5"* ]]
}

@test "clears a stale lockfile left by a dead process" {
  echo 999999 > "$LOCKFILE"
  run "$REPO/ralph-to-ralph/ralph-to-ralph.sh" https://example.com
  [ "$status" -eq 0 ]
  [ -f "$WATCHDOG_ARGS" ]
}

@test "stops a live watchdog before starting a new one" {
  # A real process we own, so kill -0 succeeds and the kill path is taken.
  # Not `sleep` — that is stubbed out to return immediately.
  tail -f /dev/null &
  local victim=$!
  echo "$victim" > "$LOCKFILE"

  run "$REPO/ralph-to-ralph/ralph-to-ralph.sh" https://example.com
  [ "$status" -eq 0 ]
  [[ "$output" == *"Stopping existing watchdog"* ]]
  [ ! -f "$LOCKFILE" ]
  [ -f "$WATCHDOG_ARGS" ]

  kill "$victim" 2>/dev/null || true
}

@test "runs cleanly when no lockfile exists" {
  [ ! -f "$LOCKFILE" ]
  run "$REPO/ralph-to-ralph/ralph-to-ralph.sh" https://example.com
  [ "$status" -eq 0 ]
  [[ "$output" != *"Stopping existing watchdog"* ]]
}

@test "surfaces a watchdog failure" {
  export WATCHDOG_RC=1
  run "$REPO/ralph-to-ralph/ralph-to-ralph.sh" https://example.com
  [ "$status" -ne 0 ]
}
