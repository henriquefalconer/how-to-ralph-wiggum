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
  cp "$BATS_TEST_DIRNAME/ralph-to-ralph.sh" "$BATS_TEST_DIRNAME/ralph-resume.sh" "$REPO/ralph/"

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

# ── resuming a run ───────────────────────────────────────────────────────────
#
# The WORK always resumes — prd.json and the phase sentinels are on disk. What a
# fresh launch loses is the RUN: a new id means a new progress file, a ledger
# restarting at zero and session numbering back at 001. --resume keeps them.

RUNS="ralph/.state/runs"

# Fabricate a finished run to resume from.
seed_run() { # <id> <url> <sessions> <cost-lines...>
  local id="$1" url="$2" n="$3"; shift 3
  local d="$REPO/$RUNS/$id"
  mkdir -p "$d"
  printf '%s\n' "$url" > "$d/target-url"
  echo "$n" > "$d/.session-counter"
  : > "$d/costs.txt"
  local c; for c in "$@"; do printf '%s\n' "$c" >> "$d/costs.txt"; done
  printf 'earlier progress\n' > "$d/progress.txt"
}

@test "a fresh run records its target url so a resume need not repeat it" {
  run "$REPO/ralph/ralph-to-ralph.sh" https://example.com
  [ "$status" -eq 0 ]
  RUN=$(ls -1 "$REPO/$RUNS" | head -1)
  [ "$(cat "$REPO/$RUNS/$RUN/target-url")" = "https://example.com" ]
}

@test "--resume with no argument continues the most recent run" {
  seed_run 20260101T000000Z https://old.example.com 3 1.5
  seed_run 20260202T000000Z https://new.example.com 7 2.5
  run "$REPO/ralph/ralph-to-ralph.sh" --resume
  [ "$status" -eq 0 ]
  [[ "$output" == *"20260202T000000Z (RESUMING)"* ]]
  # the url comes back from the run, not from the command line
  [[ "$output" == *"https://new.example.com"* ]]
  [ "$(sed -n 1p "$WATCHDOG_ARGS")" = "https://new.example.com" ]
}

@test "--resume names a specific run" {
  seed_run 20260101T000000Z https://old.example.com 3 1.5
  seed_run 20260202T000000Z https://new.example.com 7 2.5
  run "$REPO/ralph/ralph-to-ralph.sh" --resume 20260101T000000Z
  [ "$status" -eq 0 ]
  [[ "$output" == *"20260101T000000Z (RESUMING)"* ]]
  [ "$(sed -n 1p "$WATCHDOG_ARGS")" = "https://old.example.com" ]
}

@test "a resumed run reuses its directory instead of minting a new one" {
  seed_run 20260202T000000Z https://new.example.com 7 2.5
  run "$REPO/ralph/ralph-to-ralph.sh" --resume
  [ "$status" -eq 0 ]
  [ "$(ls -1 "$REPO/$RUNS" | wc -l)" -eq 1 ]
  # the ledger and session counter are left intact for the phases to continue
  [ "$(cat "$REPO/$RUNS/20260202T000000Z/.session-counter")" -eq 7 ]
  [ "$(cat "$REPO/$RUNS/20260202T000000Z/costs.txt")" = "2.5" ]
}

@test "a resumed run appends to the existing progress file and marks the resume" {
  seed_run 20260202T000000Z https://new.example.com 7 2.5
  run "$REPO/ralph/ralph-to-ralph.sh" --resume
  [ "$status" -eq 0 ]
  grep -q "earlier progress" "$REPO/$RUNS/20260202T000000Z/progress.txt"
  grep -q "RUN RESUMED" "$REPO/$RUNS/20260202T000000Z/progress.txt"
}

@test "--resume reports what the run has already spent" {
  seed_run 20260202T000000Z https://new.example.com 7 2.5 1.25
  run "$REPO/ralph/ralph-to-ralph.sh" --resume
  [[ "$output" == *"Spent so far:     \$3.7500"* ]]
  [[ "$output" == *"Sessions so far:  7"* ]]
}

@test "--resume can be given a different url than the run recorded" {
  seed_run 20260202T000000Z https://new.example.com 7 2.5
  run "$REPO/ralph/ralph-to-ralph.sh" --resume 20260202T000000Z https://override.example.com
  [ "$status" -eq 0 ]
  [ "$(sed -n 1p "$WATCHDOG_ARGS")" = "https://override.example.com" ]
}

@test "--resume still forwards iteration budgets" {
  seed_run 20260202T000000Z https://new.example.com 7 2.5
  run "$REPO/ralph/ralph-to-ralph.sh" --resume 20260202T000000Z https://new.example.com 3 4 5
  [ "$(sed -n 2p "$WATCHDOG_ARGS")" = "3" ]
  [ "$(sed -n 3p "$WATCHDOG_ARGS")" = "4" ]
  [ "$(sed -n 4p "$WATCHDOG_ARGS")" = "5" ]
}

@test "--resume refuses an unknown run instead of silently starting a new one" {
  seed_run 20260202T000000Z https://new.example.com 7 2.5
  run "$REPO/ralph/ralph-to-ralph.sh" --resume no-such-run
  [ "$status" -eq 1 ]
  [[ "$output" == *"No such run"* ]]
  [ ! -f "$WATCHDOG_ARGS" ]
}

@test "--resume with nothing to resume fails rather than guessing" {
  run "$REPO/ralph/ralph-to-ralph.sh" --resume
  [ "$status" -eq 1 ]
  [[ "$output" == *"Nothing to resume"* ]]
  [ ! -f "$WATCHDOG_ARGS" ]
}

@test "--list shows each run's sessions, spend and target" {
  seed_run 20260202T000000Z https://new.example.com 7 2.5 1.25
  run "$REPO/ralph/ralph-to-ralph.sh" --list
  [ "$status" -eq 0 ]
  [[ "$output" == *"20260202T000000Z"* ]]
  [[ "$output" == *"7 sessions"* ]]
  [[ "$output" == *"3.7500"* ]]
  [ ! -f "$WATCHDOG_ARGS" ]
}

@test "--list on a fresh checkout says so instead of erroring" {
  run "$REPO/ralph/ralph-to-ralph.sh" --list
  [ "$status" -eq 0 ]
  [[ "$output" == *"No runs recorded"* ]]
}
