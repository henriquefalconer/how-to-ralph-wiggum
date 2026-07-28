#!/usr/bin/env bats
# Tests for start.sh (the launcher).
# The watchdog is replaced by a stub that records its arguments.
# Run with: npx bats ralph-to-ralph/start.test.bats

setup() {
  REPO="$BATS_TEST_TMPDIR/repo"
  mkdir -p "$REPO/ralph-to-ralph/.state" "$REPO/bin"
  cp "$BATS_TEST_DIRNAME/start.sh" "$REPO/ralph-to-ralph/"

  export WATCHDOG_ARGS="$REPO/watchdog-args.txt"
  cat > "$REPO/ralph-to-ralph/ralph-watchdog.sh" <<'STUB'
#!/bin/bash
printf '%s\n' "$@" >> "$WATCHDOG_ARGS"
exit 0
STUB
  chmod +x "$REPO/ralph-to-ralph/ralph-watchdog.sh"

  printf '#!/bin/bash\nexit 0\n' > "$REPO/bin/sleep"
  chmod +x "$REPO/bin/sleep"
  PATH="$REPO/bin:$PATH"

  LOCKFILE="$REPO/ralph-to-ralph/.state/watchdog.lock"
}

@test "requires a target url" {
  run "$REPO/ralph-to-ralph/start.sh"
  [ "$status" -ne 0 ]
  [[ "$output" == *"Usage:"* ]]
}

@test "creates the per-phase state namespaces before starting" {
  run "$REPO/ralph-to-ralph/start.sh" https://example.com
  [ "$status" -eq 0 ]
  for phase in inspect build qa; do
    [ -d "$REPO/ralph-to-ralph/.state/progress/$phase" ]
    [ -d "$REPO/ralph-to-ralph/.state/logs/$phase" ]
  done
}

@test "hands the target url to the watchdog" {
  run "$REPO/ralph-to-ralph/start.sh" https://example.com
  [ "$status" -eq 0 ]
  [ "$(cat "$WATCHDOG_ARGS")" = "https://example.com" ]
}

@test "clears a stale lockfile left by a dead process" {
  echo 999999 > "$LOCKFILE"
  run "$REPO/ralph-to-ralph/start.sh" https://example.com
  [ "$status" -eq 0 ]
  [ -f "$WATCHDOG_ARGS" ]
}

@test "stops a live watchdog before starting a new one" {
  # A real process we own, so kill -0 succeeds and start.sh takes the kill path.
  # Not `sleep` — that is stubbed out to return immediately.
  tail -f /dev/null &
  local victim=$!
  echo "$victim" > "$LOCKFILE"

  run "$REPO/ralph-to-ralph/start.sh" https://example.com
  [ "$status" -eq 0 ]
  [[ "$output" == *"Stopping existing watchdog"* ]]
  [ ! -f "$LOCKFILE" ]
  [ -f "$WATCHDOG_ARGS" ]

  kill "$victim" 2>/dev/null || true
}

@test "runs cleanly when no lockfile exists" {
  [ ! -f "$LOCKFILE" ]
  run "$REPO/ralph-to-ralph/start.sh" https://example.com
  [ "$status" -eq 0 ]
  [[ "$output" != *"Stopping existing watchdog"* ]]
}
