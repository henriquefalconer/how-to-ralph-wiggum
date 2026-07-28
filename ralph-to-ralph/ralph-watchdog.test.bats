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
  # The sentinel holds the target URL it was written for, as the real script does.
  cat > "$REPO/ralph-to-ralph/ralph-inspect.sh" <<'STUB'
#!/bin/bash
printf '%s\n' "$@" >> "$INSPECT_ARGS"
[ "${INSPECT_NEVER_COMPLETES:-0}" = "1" ] || printf '%s\n' "$1" > "$STATE/inspect-complete"
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

  # QA: records args; writes the qa-complete sentinel, which is the watchdog's
  # only proof that a full pass ran. QA_NEVER_COMPLETES simulates a QA process
  # that dies before verifying anything.
  cat > "$REPO/ralph-to-ralph/ralph-qa.sh" <<'STUB'
#!/bin/bash
printf '%s\n' "$@" >> "$QA_ARGS"
rm -f "$STATE/qa-complete"
[ "${QA_NEVER_COMPLETES:-0}" = "1" ] && exit 1
printf 'stub pass\n' > "$STATE/qa-complete"
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

@test "skips inspect when the sentinel names this same target" {
  echo "https://example.com" > "$STATE/inspect-complete"
  run "$REPO/ralph-to-ralph/ralph-watchdog.sh" https://example.com
  [ "$status" -eq 0 ]
  [ ! -f "$INSPECT_ARGS" ]
  [ -f "$BUILD_ARGS" ]
}

@test "re-inspects when the sentinel is left over from a different target" {
  echo "https://previous-target.com" > "$STATE/inspect-complete"
  run "$REPO/ralph-to-ralph/ralph-watchdog.sh" https://example.com
  [ "$status" -eq 0 ]
  [ "$(sed -n 1p "$INSPECT_ARGS")" = "https://example.com" ]
  [ "$(cat "$STATE/inspect-complete")" = "https://example.com" ]
}

@test "aborts instead of looping when prd.json is corrupt" {
  echo '[{"id":"f1","passes":fals' > "$REPO/prd.json"
  run "$REPO/ralph-to-ralph/ralph-watchdog.sh" https://example.com
  [ "$status" -eq 1 ]
  [[ "$output" == *"cannot parse prd.json"* ]]
  # the whole point: not one agent iteration spent on an unusable file
  [ ! -f "$BUILD_ARGS" ]
  [ ! -f "$QA_ARGS" ]
  [[ "$output" != *"RALPH-TO-RALPH COMPLETE"* ]]
}

@test "aborts when prd.json is valid JSON but not a list" {
  echo '{"id":"f1"}' > "$REPO/prd.json"
  run "$REPO/ralph-to-ralph/ralph-watchdog.sh" https://example.com
  [ "$status" -eq 1 ]
  [[ "$output" == *"not a JSON list"* ]]
}

@test "a missing prd.json is diagnosed as an empty PRD, not as corruption" {
  rm -f "$REPO/prd.json"
  run "$REPO/ralph-to-ralph/ralph-watchdog.sh" https://example.com
  [ "$status" -eq 1 ]
  [[ "$output" != *"cannot parse"* ]]
  [[ "$output" == *"lists no features"* ]]
}

@test "aborts when inspect completed but left an empty feature list" {
  # `[]` parses fine, so the corruption guard waves it through — and it fails
  # all_passed (which requires total > 0) exactly like a PRD of unbuilt
  # features. Unguarded, that is 10 build restarts x 5 cycles on an empty file.
  echo '[]' > "$REPO/prd.json"
  run "$REPO/ralph-to-ralph/ralph-watchdog.sh" https://example.com
  [ "$status" -eq 1 ]
  [[ "$output" == *"lists no features"* ]]
  [ ! -f "$BUILD_ARGS" ]
  [ ! -f "$QA_ARGS" ]
  [[ "$output" != *"RALPH-TO-RALPH COMPLETE"* ]]
}

@test "aborts when the build agent truncates prd.json to an empty list mid-cycle" {
  cat > "$REPO/ralph-to-ralph/ralph-build.sh" <<'STUB'
#!/bin/bash
printf '%s\n' "$@" >> "$BUILD_ARGS"
echo '[]' > prd.json
exit 0
STUB
  chmod +x "$REPO/ralph-to-ralph/ralph-build.sh"

  run "$REPO/ralph-to-ralph/ralph-watchdog.sh" https://example.com
  [ "$status" -eq 1 ]
  [[ "$output" == *"lists no features"* ]]
  # caught on the next pass round the build loop, not after ten restarts
  [ "$(wc -l < "$BUILD_ARGS")" -eq 1 ]
}

@test "a QA run that never completes is not read as approval" {
  export QA_NEVER_COMPLETES=1
  run "$REPO/ralph-to-ralph/ralph-watchdog.sh" https://example.com
  [ "$status" -eq 1 ]
  [[ "$output" == *"no full pass ran"* ]]
  [[ "$output" != *"PASSED + QA VERIFIED"* ]]
  # three QA attempts, then it refuses to report a verified build
  [ "$(grep -c "https://example.com" "$QA_ARGS")" -eq 3 ]
}

@test "QA demoting a feature to passes:false sends it back to build" {
  # What the QA prompt now requires: a feature that fails QA is flipped back to
  # passes:false. Without it the watchdog reports success over a failing feature.
  cat > "$REPO/ralph-to-ralph/ralph-qa.sh" <<'STUB'
#!/bin/bash
printf '%s\n' "$@" >> "$QA_ARGS"
printf 'stub pass\n' > "$STATE/qa-complete"
# fail QA the first time only, so the run still terminates
[ -f "$QA_ARGS.done" ] && exit 0
touch "$QA_ARGS.done"
python3 -c "import json;d=json.load(open('prd.json'));d[0]['passes']=False;json.dump(d,open('prd.json','w'))"
exit 0
STUB
  chmod +x "$REPO/ralph-to-ralph/ralph-qa.sh"

  run "$REPO/ralph-to-ralph/ralph-watchdog.sh" https://example.com
  [ "$status" -eq 0 ]
  # cycle 1 built + QA'd, QA demoted it, cycle 2 rebuilt it
  [ "$(grep -c "https://example.com" "$QA_ARGS")" -eq 2 ]
  [ "$(wc -l < "$BUILD_ARGS")" -eq 2 ]
  [[ "$output" == *"restarting build"* ]]
  [[ "$output" == *"PASSED + QA VERIFIED"* ]]
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
