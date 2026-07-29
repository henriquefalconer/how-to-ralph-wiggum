#!/usr/bin/env bats
# Tests for ralph-lib.sh — the session runner shared by the three phase loops.
#
# The library is sourceable by design, so these exercise the real functions
# rather than copies that can drift. The load-bearing behaviours:
#   * ONE usage entry per iteration, summed across the original session and
#     every resume of it — a resume JSON carries per-turn cost, not a total
#   * "resumed Nx" is flagged next to the context shape whether or not the
#     series dipped, so "monotonic" alone never hides a multi-process iteration
#   * context/subagent figures are read out of the real transcript layout
#   * --resume is attempted BEFORE a fresh session is spent on the slot
#   * session numbering is unique across the three phase processes of one run
#
# Run with: npx bats ralph/ralph-lib.test.bats

setup() {
  LIB="$BATS_TEST_DIRNAME/ralph-lib.sh"
  TMP="$BATS_TEST_TMPDIR/t"
  mkdir -p "$TMP"

  # Keep the library's top-level setup inside the test tmpdir.
  export STATE_DIR="$TMP/.state"
  export RALPH_RUN_ID="TESTRUN"
  export HOME="$TMP/home"
  mkdir -p "$HOME"

  set --                       # the library must not consume bats's own args
  # shellcheck disable=SC1090
  source "$LIB"

  RUN_DIR="$STATE_DIR/runs/TESTRUN"
  PROGRESS="$RUN_DIR/progress.txt"
  COST_FILE="$RUN_DIR/costs.txt"
  : > "$PROGRESS"
  : > "$COST_FILE"
}

# Write a transcript of per-call usage triples into the location log_usage reads.
# <sid> <cwd> <"in:cr:cw:model" ...>
fake_transcript() {
  local sid="$1" cwd="$2"; shift 2
  local root="$HOME/.claude/projects/${cwd//\//-}"
  mkdir -p "$root"
  local n=0 spec
  for spec in "$@"; do
    IFS=: read -r i cr cw model <<<"$spec"
    n=$((n + 1))
    printf '{"message":{"id":"m%d","model":"%s","usage":{"input_tokens":%s,"cache_read_input_tokens":%s,"cache_creation_input_tokens":%s}}}\n' \
      "$n" "$model" "$i" "$cr" "$cw" >> "$root/$sid.jsonl"
  done
}

fake_subagent() { # <sid> <cwd> <agent-n> <model>
  local sid="$1" cwd="$2" n="$3" model="$4"
  local root="$HOME/.claude/projects/${cwd//\//-}/$sid/subagents"
  mkdir -p "$root"
  printf '{"message":{"id":"a%s","model":"%s","usage":{"input_tokens":10,"cache_read_input_tokens":0,"cache_creation_input_tokens":0}}}\n' \
    "$n" "$model" > "$root/agent-$n.jsonl"
}

# ── pure helpers ─────────────────────────────────────────────────────────────

@test "fmt_dur renders hours and minutes at the boundaries" {
  [ "$(fmt_dur 0)" = "0min" ]
  [ "$(fmt_dur 59)" = "1min" ]
  [ "$(fmt_dur 3600)" = "1h00min" ]
  [ "$(fmt_dur 6300)" = "1h45min" ]
  # 59m30s rounds to 60min, which must carry into the hour rather than print "0h60min"
  [ "$(fmt_dur 3570)" = "1h00min" ]
}

@test "promise_of accepts each phase's own vocabulary" {
  [ "$(promise_of "blah <promise>NEXT</promise>" 'NEXT|INSPECT_COMPLETE')" = "NEXT" ]
  [ "$(promise_of "<promise>INSPECT_COMPLETE</promise>" 'NEXT|INSPECT_COMPLETE')" = "INSPECT_COMPLETE" ]
  [ "$(promise_of "<promise>QA_COMPLETE</promise>" 'NEXT|QA_COMPLETE')" = "QA_COMPLETE" ]
  [ "$(promise_of "<promise>COMPLETE</promise>" 'NEXT|COMPLETE')" = "COMPLETE" ]
  # the last tag wins, and a foreign phase's tag is not accepted
  [ "$(promise_of "<promise>NEXT</promise> then <promise>COMPLETE</promise>" 'NEXT|COMPLETE')" = "COMPLETE" ]
  [ -z "$(promise_of "<promise>QA_COMPLETE</promise>" 'NEXT|COMPLETE')" ]
  [ -z "$(promise_of "no tag at all" 'NEXT|COMPLETE')" ]
}

@test "jsonfield reads a field and fails cleanly on a missing one" {
  printf '{"total_cost_usd": 1.25, "session_id": "abc"}' > "$TMP/s.json"
  [ "$(jsonfield "$TMP/s.json" session_id)" = "abc" ]
  run jsonfield "$TMP/s.json" nope
  [ "$status" -ne 0 ]
  run jsonfield "$TMP/missing.json" session_id
  [ "$status" -ne 0 ]
}

# ── the usage ledger ─────────────────────────────────────────────────────────

@test "log_usage writes a header with the wall-clock duration" {
  printf '{"session_id":"s1","total_cost_usd":1.2345,"modelUsage":{}}' > "$TMP/x.json"
  SESSION_SECS=6300
  log_usage "build-9" "$TMP/x.json"
  grep -qF -- 'UTC (1h45min) - Session usage — build-9 [claude-sonnet-5]' "$PROGRESS"
}

@test "log_usage prints cost to 4 decimal places" {
  printf '{"session_id":"s2","total_cost_usd":3.9363649500000006,"modelUsage":{}}' > "$TMP/y.json"
  SESSION_SECS=60
  log_usage "build-1" "$TMP/y.json"
  grep -qF -- '- cost $3.9364 (from claude -p)' "$PROGRESS"
}

@test "log_usage flags a disagreement between total_cost_usd and the per-model sum" {
  cat > "$TMP/z.json" <<'JSON'
{"session_id":"s3","total_cost_usd":12.3886,
 "modelUsage":{"claude-sonnet-5":{"costUSD":11.7037,"contextWindow":1000000},
               "claude-opus-5[1m]":{"costUSD":4.8474,"contextWindow":1000000}}}
JSON
  SESSION_SECS=60
  log_usage "build-2" "$TMP/z.json"
  grep -qF -- 'per-model sums to $16.5511' "$PROGRESS"
}

@test "log_usage appends the cost to the ledger file" {
  printf '{"session_id":"s4","total_cost_usd":2.5,"modelUsage":{}}' > "$TMP/w.json"
  SESSION_SECS=60
  log_usage "build-3" "$TMP/w.json"
  [ "$(cat "$COST_FILE")" = "2.5" ]
  [ "$(spent_usd)" = "2.5000" ]
}

@test "log_usage does nothing when the session JSON has no cost" {
  printf '{"session_id":"s5"}' > "$TMP/v.json"
  before="$(wc -c < "$PROGRESS")"
  log_usage "build-4" "$TMP/v.json"
  [ "$(wc -c < "$PROGRESS")" -eq "$before" ]
}

@test "log_usage survives a truncated session JSON" {
  printf '{"session_id":' > "$TMP/u.json"
  run log_usage "build-5" "$TMP/u.json"
  [ "$status" -eq 0 ]
}

@test "log_usage names the session JSON as the transcript" {
  printf '{"session_id":"s6","total_cost_usd":1.0,"modelUsage":{}}' > "$TMP/t.json"
  SESSION_SECS=60
  log_usage "qa-3" "$TMP/t.json"
  grep -qF -- "- transcript: $TMP/t.json" "$PROGRESS"
}

# ── context, models and subagents, read from real transcripts ────────────────

@test "context reports peak, window percentage, call count and shape" {
  cwd="$TMP/repo"
  fake_transcript "sid1" "$cwd" "100:0:0:claude-sonnet-5" "200:50000:0:claude-sonnet-5" "300:150000:50000:claude-sonnet-5"
  cat > "$TMP/c.json" <<JSON
{"session_id":"sid1","cwd":"$cwd","total_cost_usd":1.0,
 "modelUsage":{"claude-sonnet-5":{"costUSD":1.0,"contextWindow":1000000,"inputTokens":600,"outputTokens":900,"cacheReadInputTokens":200000}}}
JSON
  SESSION_SECS=60
  log_usage "build-1" "$TMP/c.json"
  # peak = 300 + 150000 + 50000 = 200,300 of 1M = 20%
  grep -qF -- '- context 200,300 tok peak of 1M (20%) across 3 inference calls, monotonic' "$PROGRESS"
}

@test "a sustained context drop is reported instead of monotonic" {
  cwd="$TMP/repo"
  fake_transcript "sid2" "$cwd" "0:900000:0:claude-sonnet-5" "0:100000:0:claude-sonnet-5"
  cat > "$TMP/d.json" <<JSON
{"session_id":"sid2","cwd":"$cwd","total_cost_usd":1.0,
 "modelUsage":{"claude-sonnet-5":{"costUSD":1.0,"contextWindow":1000000}}}
JSON
  SESSION_SECS=60
  log_usage "build-2" "$TMP/d.json"
  grep -qF -- '1 drop(s), final 100,000' "$PROGRESS"
}

@test "subagents are counted and broken down by model" {
  cwd="$TMP/repo"
  fake_transcript "sid3" "$cwd" "10:0:0:claude-sonnet-5"
  fake_subagent "sid3" "$cwd" 1 "claude-sonnet-5"
  fake_subagent "sid3" "$cwd" 2 "claude-sonnet-5"
  fake_subagent "sid3" "$cwd" 3 "claude-opus-5[1m]"
  cat > "$TMP/e.json" <<JSON
{"session_id":"sid3","cwd":"$cwd","total_cost_usd":1.0,
 "modelUsage":{"claude-sonnet-5":{"costUSD":1.0,"contextWindow":1000000}}}
JSON
  SESSION_SECS=60
  log_usage "build-3" "$TMP/e.json"
  grep -qF -- '- subagents (3) sonnet-5 x2 · opus-5[1m] x1' "$PROGRESS"
}

@test "models line leads with the costliest and details only that one" {
  cwd="$TMP/repo"
  fake_transcript "sid4" "$cwd" "10:0:0:claude-sonnet-5"
  cat > "$TMP/f.json" <<JSON
{"session_id":"sid4","cwd":"$cwd","total_cost_usd":10.5674,
 "modelUsage":{"claude-sonnet-5":{"costUSD":10.0124,"contextWindow":1000000,"inputTokens":278,"outputTokens":85511,"cacheReadInputTokens":24330061},
               "claude-haiku-4-5":{"costUSD":0.5550,"contextWindow":200000}}}
JSON
  SESSION_SECS=60
  log_usage "build-4" "$TMP/f.json"
  grep -qF -- '- models sonnet-5 $10.0124 (in 278 / out 85,511 / cache-read 24,330,061) · haiku-4-5 $0.5550' "$PROGRESS"
}

# ── one iteration = the session plus its resumes ─────────────────────────────

@test "a resumed iteration writes ONE usage entry, summing every invocation" {
  printf '{"session_id":"n","total_cost_usd":0.1008,"modelUsage":{"claude-sonnet-5":{"costUSD":0.1008,"contextWindow":1000000}}}' > "$TMP/a.json"
  printf '{"session_id":"n","total_cost_usd":0.0150,"modelUsage":{"claude-sonnet-5":{"costUSD":0.0150,"contextWindow":1000000}}}' > "$TMP/b.json"
  SESSION_SECS=120
  log_usage "build-7" "$TMP/a.json" "$TMP/b.json"
  [ "$(grep -c 'Session usage' "$PROGRESS")" -eq 1 ]
  grep -qF -- 'cost $0.1158' "$PROGRESS"
}

@test "merging invocations sums counters but not the context window" {
  printf '{"session_id":"n","total_cost_usd":0.05,"modelUsage":{"claude-sonnet-5":{"costUSD":0.05,"outputTokens":100,"contextWindow":1000000}}}' > "$TMP/a.json"
  cp "$TMP/a.json" "$TMP/b.json"
  SESSION_SECS=60
  log_usage "build-7" "$TMP/a.json" "$TMP/b.json"
  grep -qF -- 'out 200' "$PROGRESS"      # counters add
  run grep -qF -- 'of 2M' "$PROGRESS"    # the window must not
  [ "$status" -ne 0 ]
}

@test "the resumed count sits next to the shape even when the context is monotonic" {
  cwd="$TMP/repo"
  fake_transcript "sid5" "$cwd" "0:1000:0:claude-sonnet-5" "0:2000:0:claude-sonnet-5" "0:3000:0:claude-sonnet-5"
  cat > "$TMP/g1.json" <<JSON
{"session_id":"sid5","cwd":"$cwd","total_cost_usd":0.10,
 "modelUsage":{"claude-sonnet-5":{"costUSD":0.10,"contextWindow":1000000}}}
JSON
  cp "$TMP/g1.json" "$TMP/g2.json"
  cp "$TMP/g1.json" "$TMP/g3.json"
  SESSION_SECS=60
  log_usage "build-8" "$TMP/g1.json" "$TMP/g2.json" "$TMP/g3.json"
  grep -qF -- 'inference calls, monotonic, resumed 2x' "$PROGRESS"
  [ "$(grep -c 'Session usage' "$PROGRESS")" -eq 1 ]
}

@test "an unresumed iteration carries no resumed marker" {
  cwd="$TMP/repo"
  fake_transcript "sid6" "$cwd" "0:1000:0:claude-sonnet-5"
  cat > "$TMP/h.json" <<JSON
{"session_id":"sid6","cwd":"$cwd","total_cost_usd":0.10,
 "modelUsage":{"claude-sonnet-5":{"costUSD":0.10,"contextWindow":1000000}}}
JSON
  SESSION_SECS=60
  log_usage "build-9" "$TMP/h.json"
  run grep -q 'resumed' "$PROGRESS"
  [ "$status" -ne 0 ]
}

@test "begin/flush emit nothing until the iteration ends" {
  printf '{"session_id":"n","total_cost_usd":0.5,"modelUsage":{}}' > "$TMP/i.json"
  begin_iteration_usage
  ITER_JSONS+=( "$TMP/i.json" ); ITER_SECS=30
  [ "$(wc -c < "$PROGRESS")" -eq 0 ]        # nothing written mid-iteration
  flush_iteration_usage "build-10"
  [ "$(grep -c 'Session usage' "$PROGRESS")" -eq 1 ]
  [ "$USAGE_DEFERRED" -eq 0 ]
}

@test "flush is a no-op when the iteration ran no sessions" {
  begin_iteration_usage
  flush_iteration_usage "build-11"
  [ "$(wc -c < "$PROGRESS")" -eq 0 ]
}

# ── resume-on-no-promise ─────────────────────────────────────────────────────

@test "resumable_session_id reads the id from a successful session JSON" {
  printf '{"is_error":false,"session_id":"abc-123","result":"waiting for the gate"}' > "$TMP/s.json"
  run resumable_session_id "$TMP/s.json"
  [ "$status" -eq 0 ]
  [ "$output" = "abc-123" ]
}

@test "session_errored tells a session that died from one that ran" {
  printf '{"session_id":"s","is_error":false,"result":"done"}' > "$TMP/ok.json"
  run session_errored "$TMP/ok.json"
  [ "$status" -eq 1 ]                 # ran to completion

  printf '{"session_id":"s","is_error":true,"result":"API Error: 529 Overloaded."}' > "$TMP/529.json"
  run session_errored "$TMP/529.json"
  [ "$status" -eq 0 ]                 # died

  # A truncated JSON means the session died before writing its own result.
  printf '{"session_id":' > "$TMP/trunc.json"
  run session_errored "$TMP/trunc.json"
  [ "$status" -eq 0 ]

  run session_errored "$TMP/missing.json"
  [ "$status" -eq 0 ]
}

@test "session_errored falls back to the last session when given no argument" {
  printf '{"session_id":"s","is_error":true,"result":"API Error: 529 Overloaded."}' > "$TMP/last.json"
  LAST_JSON="$TMP/last.json"
  run session_errored
  [ "$status" -eq 0 ]
}

@test "resumable_session_id refuses an errored, missing or truncated session JSON" {
  printf '{"is_error":true,"session_id":"abc-123"}' > "$TMP/err.json"
  run resumable_session_id "$TMP/err.json"
  [ "$status" -ne 0 ]

  run resumable_session_id "$TMP/does-not-exist.json"
  [ "$status" -ne 0 ]

  printf '{"is_error":false,' > "$TMP/trunc.json"
  run resumable_session_id "$TMP/trunc.json"
  [ "$status" -ne 0 ]
}

@test "the resume nudge is one sentence telling it not to background the command" {
  write_resume_prompt "$TMP/nudge.txt"
  [ "$(wc -l < "$TMP/nudge.txt")" -eq 1 ]
  run cat "$TMP/nudge.txt"
  [[ "$output" == *"without backgrounding"* ]]
  [[ "$output" == *"promise"* ]]
}

@test "run_session passes --resume only when given a session id" {
  fn=$(sed -n '/^run_session() {/,/^}/p' "$LIB")
  [[ "$fn" == *'sid="${3:-}"'* ]]
  [[ "$fn" == *'resume_args=( --resume "$sid" )'* ]]
  # An empty array must not expand to a bogus empty argument under set -u.
  [[ "$fn" == *'${resume_args[@]+"${resume_args[@]}"}'* ]]
}

@test "run_iteration resumes before the caller is allowed to burn a fresh session" {
  # Order matters: a restart throws away everything the stranded session did.
  resume_line=$(grep -n 'resumable_session_id "\$LAST_JSON"' "$LIB" | head -1 | cut -d: -f1)
  flush_line=$(grep -n 'flush_iteration_usage "\$label"' "$LIB" | head -1 | cut -d: -f1)
  [ -n "$resume_line" ] && [ -n "$flush_line" ]
  [ "$resume_line" -lt "$flush_line" ]
}

@test "run_session defers its usage entry while an iteration is accumulating" {
  fn=$(sed -n '/^run_session() {/,/^}/p' "$LIB")
  [[ "$fn" == *'ITER_JSONS+=( "$out" )'* ]]
  [[ "$fn" == *'USAGE_DEFERRED'* ]]
}

# ── run namespacing ──────────────────────────────────────────────────────────

@test "every phase of one run shares the run directory and progress file" {
  [ "$RUN_DIR" = "$STATE_DIR/runs/TESTRUN" ]
  [ -f "$PROGRESS" ]
  [ "$RALPH_PROGRESS" = "$PROGRESS" ]
}

@test "session numbers are unique across the separate phase processes of a run" {
  # Each phase is its own process; an in-memory counter would restart at 001
  # three times over and collide the transcripts the run dir exists to separate.
  echo 7 > "$SESSION_COUNTER"
  n=$(( $(cat "$SESSION_COUNTER") + 1 )); echo "$n" > "$SESSION_COUNTER"
  [ "$(cat "$SESSION_COUNTER")" -eq 8 ]
  grep -q 'SESSION_N=\$(( \$(cat "\$SESSION_COUNTER"' "$LIB"
}

@test "the session runner asks for JSON output, which the ledger depends on" {
  grep -q -- '--output-format json' "$LIB"
}
