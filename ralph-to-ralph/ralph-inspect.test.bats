#!/usr/bin/env bats
# Tests for ralph-inspect.sh (Phase 1 loop).
#
# `claude` is replaced by a stub that behaves like `claude -p --output-format
# json`: it reads the prompt from STDIN and writes a session JSON to STDOUT.
# STUB_OUT / STUB_RC set the default `result` text; STUB_OUT_<n> / STUB_RC_<n>
# override the nth invocation, which is how a resume is driven.
# Run with: npx bats ralph-to-ralph/ralph-inspect.test.bats

setup() {
  REPO="$BATS_TEST_TMPDIR/repo"
  mkdir -p "$REPO/ralph-to-ralph/.state" "$REPO/bin"
  cp "$BATS_TEST_DIRNAME/ralph-inspect.sh" "$BATS_TEST_DIRNAME/ralph-lib.sh" "$REPO/ralph-to-ralph/"

  export RALPH_RUN_ID="TESTRUN"
  RUN_DIR="$REPO/ralph-to-ralph/.state/runs/TESTRUN"
  PROGRESS_FILE="$RUN_DIR/progress.txt"

  export STUB_ARGS="$REPO/claude-args.txt"      # argv, one word per line
  export STUB_STDIN="$REPO/claude-stdin.txt"    # the assembled prompt
  export STUB_CALLS="$REPO/claude-calls.txt"
  echo 0 > "$STUB_CALLS"

  # A real session also appends to its transcript under
  # ~/.claude/projects/<cwd>/<session-id>.jsonl — the ledger reads context and
  # subagent figures from there, so the stub writes one too. --resume appends to
  # the SAME transcript, which is what makes a resumed iteration one series.
  export HOME="$REPO/home"
  mkdir -p "$HOME"
  export TRANSCRIPT_ROOT="$HOME/.claude/projects/${REPO//\//-}"
  mkdir -p "$TRANSCRIPT_ROOT"

  cat > "$REPO/bin/claude" <<'STUB'
#!/bin/bash
printf '%s\n' "$@" >> "$STUB_ARGS"
cat >> "$STUB_STDIN"
n=$(( $(cat "$STUB_CALLS") + 1 )); echo "$n" > "$STUB_CALLS"
out="STUB_OUT_$n"; rc="STUB_RC_$n"; err="STUB_ERR_$n"
sid="${STUB_SID:-sid-abc}"
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

  printf '#!/bin/bash\nexit 0\n' > "$REPO/bin/sleep"
  chmod +x "$REPO/bin/sleep"

  PATH="$REPO/bin:$PATH"
}

@test "requires a target url" {
  run "$REPO/ralph-to-ralph/ralph-inspect.sh"
  [ "$status" -ne 0 ]
  [[ "$output" == *"Usage:"* ]]
}

@test "seeds prd.json and the run namespace on first run" {
  export STUB_OUT="<promise>INSPECT_COMPLETE</promise>"
  run "$REPO/ralph-to-ralph/ralph-inspect.sh" https://example.com 1
  [ "$status" -eq 0 ]
  [ "$(cat "$REPO/prd.json")" = "[]" ]
  [ -d "$RUN_DIR" ]
  [ -f "$PROGRESS_FILE" ]
  [ -d "$REPO/screenshots" ]
}

@test "records the target it is inspecting for" {
  export STUB_OUT="<promise>INSPECT_COMPLETE</promise>"
  run "$REPO/ralph-to-ralph/ralph-inspect.sh" https://example.com 1
  [ "$(cat "$REPO/ralph-to-ralph/.state/inspect-target")" = "https://example.com" ]
}

@test "keeps the previous run's artifacts when the target is unchanged" {
  # A restarted or resumed inspection of the same product must build on what it
  # already has — only a *different* target invalidates it.
  export STUB_OUT="<promise>NEXT</promise>"
  run "$REPO/ralph-to-ralph/ralph-inspect.sh" https://example.com 1
  echo '[{"id":"f1"}]' > "$REPO/prd.json"
  echo "spec for example.com" > "$REPO/spec-build.md"

  run "$REPO/ralph-to-ralph/ralph-inspect.sh" https://example.com 1
  [ "$status" -eq 0 ]
  [ "$(cat "$REPO/prd.json")" = '[{"id":"f1"}]' ]
  [ -f "$REPO/spec-build.md" ]
  [ ! -d "$REPO/ralph-to-ralph/.state/archive" ]
}

@test "archives the previous target's artifacts when the target changes" {
  # The inspect prompt tells the agent to *append* to prd.json. Pointed at a new
  # product with the old PRD still on disk, run #2 builds a chimera of both.
  export STUB_OUT="<promise>NEXT</promise>"
  run "$REPO/ralph-to-ralph/ralph-inspect.sh" https://first-target.com 1
  echo '[{"id":"first-target-feature"}]' > "$REPO/prd.json"
  echo "spec for the first target" > "$REPO/spec-build.md"
  echo "sitemap for the first target" > "$REPO/sitemap.md"
  printf 'https://first-target.com\n' > "$REPO/ralph-to-ralph/.state/inspect-complete"

  run "$REPO/ralph-to-ralph/ralph-inspect.sh" https://second-target.com 1
  [ "$status" -eq 0 ]
  [[ "$output" == *"Target changed"* ]]

  # the new run starts clean
  [ "$(cat "$REPO/prd.json")" = "[]" ]
  [ ! -f "$REPO/spec-build.md" ]
  [ ! -f "$REPO/sitemap.md" ]
  [ ! -f "$REPO/ralph-to-ralph/.state/inspect-complete" ]
  [ "$(cat "$REPO/ralph-to-ralph/.state/inspect-target")" = "https://second-target.com" ]

  # nothing is destroyed — the old run is recoverable
  ARCHIVE=$(find "$REPO/ralph-to-ralph/.state/archive" -mindepth 1 -maxdepth 1 -type d | head -1)
  [ -n "$ARCHIVE" ]
  grep -q "first-target-feature" "$ARCHIVE/prd.json"
  grep -q "first target" "$ARCHIVE/spec-build.md"
}

@test "drives the browser through claude-in-chrome, not a separate session" {
  export STUB_OUT="<promise>INSPECT_COMPLETE</promise>"
  run "$REPO/ralph-to-ralph/ralph-inspect.sh" https://example.com 1
  [ "$status" -eq 0 ]
  # --chrome hands the agent the already-signed-in Chrome window
  grep -qx -- "--chrome" "$STUB_ARGS"
  grep -q -- "@claude-in-chrome-reference.md" "$STUB_STDIN"
}

@test "invokes claude with the pinned model and asks for JSON output" {
  export STUB_OUT="<promise>INSPECT_COMPLETE</promise>"
  run "$REPO/ralph-to-ralph/ralph-inspect.sh" https://example.com 1
  [ "$status" -eq 0 ]
  grep -qx -- "--model" "$STUB_ARGS"
  grep -qx -- "claude-sonnet-5" "$STUB_ARGS"
  grep -qx -- "--output-format" "$STUB_ARGS"
  grep -qx -- "json" "$STUB_ARGS"
}

@test "passes the target url, iteration and progress path into the prompt" {
  export STUB_OUT="<promise>INSPECT_COMPLETE</promise>"
  run "$REPO/ralph-to-ralph/ralph-inspect.sh" https://example.com 7
  grep -q "TARGET URL: https://example.com" "$STUB_STDIN"
  grep -q "ITERATION: 1 of 7" "$STUB_STDIN"
  grep -q "PROGRESS: .*runs/TESTRUN/progress.txt" "$STUB_STDIN"
}

@test "INSPECT_COMPLETE writes the sentinel the watchdog polls for" {
  export STUB_OUT="<promise>INSPECT_COMPLETE</promise>"
  run "$REPO/ralph-to-ralph/ralph-inspect.sh" https://example.com 3
  [ "$status" -eq 0 ]
  # keyed by target URL — the watchdog compares it before skipping Phase 1
  [ "$(cat "$REPO/ralph-to-ralph/.state/inspect-complete")" = "https://example.com" ]
  [ "$(cat "$STUB_CALLS")" -eq 1 ]
}

@test "NEXT keeps iterating and leaves no sentinel when the budget runs out" {
  export STUB_OUT="<promise>NEXT</promise>"
  run "$REPO/ralph-to-ralph/ralph-inspect.sh" https://example.com 3
  [ "$status" -eq 0 ]
  [ "$(cat "$STUB_CALLS")" -eq 3 ]
  [ ! -f "$REPO/ralph-to-ralph/.state/inspect-complete" ]
  [[ "$output" == *"may be incomplete"* ]]
}

@test "NEXT then INSPECT_COMPLETE stops at the completing iteration" {
  export STUB_OUT_1="<promise>NEXT</promise>"
  export STUB_OUT_2="<promise>INSPECT_COMPLETE</promise>"
  run "$REPO/ralph-to-ralph/ralph-inspect.sh" https://example.com 9
  [ "$status" -eq 0 ]
  [ "$(cat "$STUB_CALLS")" -eq 2 ]
  [[ "$output" == *"complete after 2 iterations"* ]]
}

@test "a foreign phase's promise tag is not accepted" {
  export STUB_OUT="<promise>QA_COMPLETE</promise>"
  export RALPH_MAX_FAILURES=1
  export RALPH_RESUME_MAX=0
  run "$REPO/ralph-to-ralph/ralph-inspect.sh" https://example.com 9
  [ "$status" -eq 1 ]
  [ ! -f "$REPO/ralph-to-ralph/.state/inspect-complete" ]
}

@test "aborts after MAX_FAILURES consecutive iterations with no promise" {
  export STUB_OUT="no promise in here"
  export RALPH_MAX_FAILURES=2
  export RALPH_RESUME_MAX=0
  run "$REPO/ralph-to-ralph/ralph-inspect.sh" https://example.com 99
  [ "$status" -eq 1 ]
  [ "$(cat "$STUB_CALLS")" -eq 2 ]
  [[ "$output" == *"2 consecutive iterations produced no promise"* ]]
}

# ── resume: the session ended stranded, not broken ───────────────────────────

@test "a session that ends with no promise is resumed rather than restarted" {
  export STUB_OUT_1="I started the gate in the background and am waiting for it"
  export STUB_OUT_2="<promise>NEXT</promise>"
  export STUB_OUT_3="<promise>INSPECT_COMPLETE</promise>"
  run "$REPO/ralph-to-ralph/ralph-inspect.sh" https://example.com 9
  [ "$status" -eq 0 ]
  # call 2 is the resume of call 1's session, not a fresh iteration
  grep -qx -- "--resume" "$STUB_ARGS"
  grep -qx -- "sid-abc" "$STUB_ARGS"
  [[ "$output" == *"resuming session sid-abc"* ]]
  # the resume prompt is the nudge, not the iteration prompt
  grep -q "Repeat the command without backgrounding it" "$STUB_STDIN"
}

@test "the resumed iteration and its parent write ONE usage entry, flagged resumed 1x" {
  export STUB_OUT_1="no promise, stranded on a background job"
  export STUB_OUT_2="<promise>INSPECT_COMPLETE</promise>"
  run "$REPO/ralph-to-ralph/ralph-inspect.sh" https://example.com 9
  [ "$status" -eq 0 ]
  [ "$(cat "$STUB_CALLS")" -eq 2 ]
  # two invocations, ONE ledger entry
  [ "$(grep -c 'Session usage' "$PROGRESS_FILE")" -eq 1 ]
  # cost is summed across both, not taken from the last
  grep -qF -- 'cost $1.0000' "$PROGRESS_FILE"
  grep -q 'resumed 1x' "$PROGRESS_FILE"
}

@test "resumes are bounded, and the iteration then counts as a failure" {
  export STUB_OUT="never promises anything"
  export RALPH_RESUME_MAX=2
  export RALPH_MAX_FAILURES=1
  run "$REPO/ralph-to-ralph/ralph-inspect.sh" https://example.com 99
  [ "$status" -eq 1 ]
  # 1 original + 2 resumes, then the iteration is abandoned
  [ "$(cat "$STUB_CALLS")" -eq 3 ]
  [[ "$output" == *"no promise after 2 resume(s)"* ]]
}

@test "an errored session is not resumed" {
  # --resume cannot rescue a session the CLI itself failed; only a stranded one.
  export STUB_OUT="no promise"
  export STUB_ERR=1
  export RALPH_RESUME_MAX=4
  export RALPH_MAX_FAILURES=1
  run "$REPO/ralph-to-ralph/ralph-inspect.sh" https://example.com 99
  [ "$status" -eq 1 ]
  [ "$(cat "$STUB_CALLS")" -eq 1 ]
  run grep -qx -- "--resume" "$STUB_ARGS"
  [ "$status" -ne 0 ]
}

# ── the single run-wide progress file ────────────────────────────────────────

@test "every session of the run appends to one progress file" {
  export STUB_OUT_1="<promise>NEXT</promise>"
  export STUB_OUT_2="<promise>NEXT</promise>"
  export STUB_OUT_3="<promise>INSPECT_COMPLETE</promise>"
  run "$REPO/ralph-to-ralph/ralph-inspect.sh" https://example.com 9
  [ "$status" -eq 0 ]
  # one file, three usage entries — not three files
  [ "$(find "$RUN_DIR" -name 'progress*.txt' | wc -l)" -eq 1 ]
  [ "$(grep -c 'Session usage' "$PROGRESS_FILE")" -eq 3 ]
  grep -q "Phase 1 (Inspect) starting" "$PROGRESS_FILE"
  grep -q "Phase 1 (Inspect) complete after 3 iterations" "$PROGRESS_FILE"
}

@test "each session gets its own numbered JSON in the run directory" {
  export STUB_OUT_1="<promise>NEXT</promise>"
  export STUB_OUT_2="<promise>INSPECT_COMPLETE</promise>"
  run "$REPO/ralph-to-ralph/ralph-inspect.sh" https://example.com 9
  [ -f "$RUN_DIR/001-inspect-1.json" ]
  [ -f "$RUN_DIR/002-inspect-2.json" ]
  # the ledger names it by the repo-relative path the scripts work in
  grep -qF -- "- transcript: ralph-to-ralph/.state/runs/TESTRUN/001-inspect-1.json" "$PROGRESS_FILE"
}

@test "the prompt points the agent at the progress file's tail, not the whole file" {
  export STUB_OUT="<promise>INSPECT_COMPLETE</promise>"
  run "$REPO/ralph-to-ralph/ralph-inspect.sh" https://example.com 1
  grep -q "tail -200" "$STUB_STDIN"
  grep -q "Do NOT read the whole file" "$STUB_STDIN"
}
