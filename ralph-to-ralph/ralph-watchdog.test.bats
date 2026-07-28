#!/usr/bin/env bats
# Tests for ralph-watchdog.sh (phase orchestration + restart logic).
#
# The three phase scripts and `git` are replaced by stubs so the watchdog's
# control flow can be driven without running an agent or touching a real repo.
# Run with: npx bats ralph-to-ralph/ralph-watchdog.test.bats

setup() {
  REPO="$BATS_TEST_TMPDIR/repo"
  mkdir -p "$REPO/ralph-to-ralph/.state" "$REPO/bin"
  cp "$BATS_TEST_DIRNAME/ralph-watchdog.sh" "$REPO/ralph-to-ralph/"

  export INSPECT_ARGS="$REPO/inspect-args.txt"
  export BUILD_ARGS="$REPO/build-args.txt"
  export QA_ARGS="$REPO/qa-args.txt"
  export STATE="$REPO/ralph-to-ralph/.state"

  # Inspect: records args; writes the completion sentinel unless told not to.
  cat > "$REPO/ralph-to-ralph/ralph-inspect.sh" <<'STUB'
#!/bin/bash
printf '%s\n' "$@" >> "$INSPECT_ARGS"
[ "${INSPECT_NEVER_COMPLETES:-0}" = "1" ] || touch "$STATE/inspect-complete"
exit 0
STUB

  # Build: records args; flips every prd entry to passes:true unless told not to.
  cat > "$REPO/ralph-to-ralph/ralph-build.sh" <<'STUB'
#!/bin/bash
printf '%s\n' "$@" >> "$BUILD_ARGS"
if [ "${BUILD_NEVER_PASSES:-0}" != "1" ]; then
  python3 - <<'PY'
import json
d = json.load(open("prd.json"))
for x in d:
    x["passes"] = True
json.dump(d, open("prd.json", "w"))
PY
fi
exit 0
STUB

  cat > "$REPO/ralph-to-ralph/ralph-qa.sh" <<'STUB'
#!/bin/bash
printf '%s\n' "$@" >> "$QA_ARGS"
exit 0
STUB

  chmod +x "$REPO/ralph-to-ralph"/ralph-{inspect,build,qa}.sh

  # The watchdog commits between phases; keep it away from a real repo.
  printf '#!/bin/bash\nexit 0\n' > "$REPO/bin/git"
  printf '#!/bin/bash\nexit 0\n' > "$REPO/bin/sleep"
  chmod +x "$REPO/bin/git" "$REPO/bin/sleep"
  PATH="$REPO/bin:$PATH"

  echo '[{"id":"f1","passes":false}]' > "$REPO/prd.json"
}

@test "requires a target url" {
  run "$REPO/ralph-to-ralph/ralph-watchdog.sh"
  [ "$status" -ne 0 ]
  [[ "$output" == *"Usage:"* ]]
}

@test "refuses to start when a live watchdog already holds the lock" {
  echo $$ > "$STATE/watchdog.lock"   # this bats process is alive
  run "$REPO/ralph-to-ralph/ralph-watchdog.sh" https://example.com
  [ "$status" -eq 0 ]
  [[ "$output" == *"already running"* ]]
  [ ! -f "$INSPECT_ARGS" ]
}

@test "takes over a stale lock left by a dead process" {
  echo 999999 > "$STATE/watchdog.lock"   # PID that cannot be alive
  run "$REPO/ralph-to-ralph/ralph-watchdog.sh" https://example.com
  [ "$status" -eq 0 ]
  [ -f "$INSPECT_ARGS" ]
}

@test "releases the lock on exit" {
  run "$REPO/ralph-to-ralph/ralph-watchdog.sh" https://example.com
  [ ! -f "$STATE/watchdog.lock" ]
}

@test "runs inspect, build then QA and reports full verification" {
  run "$REPO/ralph-to-ralph/ralph-watchdog.sh" https://example.com
  [ "$status" -eq 0 ]
  [ -f "$INSPECT_ARGS" ]
  [ -f "$BUILD_ARGS" ]
  [ -f "$QA_ARGS" ]
  [[ "$output" == *"PASSED + QA VERIFIED"* ]]
}

@test "forwards the iteration budgets to each phase" {
  run "$REPO/ralph-to-ralph/ralph-watchdog.sh" https://example.com 3 4 5
  [ "$status" -eq 0 ]
  [ "$(sed -n 2p "$INSPECT_ARGS")" = "3" ]
  [ "$(sed -n 1p "$BUILD_ARGS")" = "4" ]
  [ "$(sed -n 2p "$QA_ARGS")" = "5" ]
}

@test "defaults each phase budget to 999 when none is given" {
  run "$REPO/ralph-to-ralph/ralph-watchdog.sh" https://example.com
  [ "$(sed -n 2p "$INSPECT_ARGS")" = "999" ]
  [ "$(sed -n 1p "$BUILD_ARGS")" = "999" ]
  [ "$(sed -n 2p "$QA_ARGS")" = "999" ]
}

@test "passes the target url to inspect and QA" {
  run "$REPO/ralph-to-ralph/ralph-watchdog.sh" https://example.com
  [ "$(sed -n 1p "$INSPECT_ARGS")" = "https://example.com" ]
  [ "$(sed -n 1p "$QA_ARGS")" = "https://example.com" ]
}

@test "skips inspect entirely when the sentinel already exists" {
  touch "$STATE/inspect-complete"
  run "$REPO/ralph-to-ralph/ralph-watchdog.sh" https://example.com
  [ "$status" -eq 0 ]
  [ ! -f "$INSPECT_ARGS" ]
  [ -f "$BUILD_ARGS" ]
}

@test "gives up after five inspect attempts that never complete" {
  export INSPECT_NEVER_COMPLETES=1
  run "$REPO/ralph-to-ralph/ralph-watchdog.sh" https://example.com
  [ "$status" -eq 1 ]
  # one invocation per attempt (each writes url + budget, so count the url)
  [ "$(grep -c "https://example.com" "$INSPECT_ARGS")" -eq 5 ]
  [[ "$output" == *"Hit max restarts"* ]]
  [ ! -f "$BUILD_ARGS" ]
}

@test "gives up on build after ten attempts and still runs QA" {
  export BUILD_NEVER_PASSES=1
  run "$REPO/ralph-to-ralph/ralph-watchdog.sh" https://example.com
  [ "$status" -eq 0 ]
  [[ "$output" == *"Hit max restarts (10)"* ]]
  [ -f "$QA_ARGS" ]
  # build+QA cycle repeats up to MAX_CYCLES when features never pass
  [ "$(grep -c "https://example.com" "$QA_ARGS")" -eq 5 ]
}

@test "writes a timestamped run log under the watchdog log namespace" {
  run "$REPO/ralph-to-ralph/ralph-watchdog.sh" https://example.com
  [ "$(ls "$STATE/logs/watchdog" | wc -l)" -eq 1 ]
  grep -q "Watchdog Started" "$STATE/logs/watchdog"/*.log
}
