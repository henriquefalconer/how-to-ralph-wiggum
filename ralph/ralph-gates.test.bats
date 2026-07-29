#!/usr/bin/env bats
# Tests for ralph-gates.sh — preconditions repaired by an agent, not fatal.
#
# The load-bearing behaviours:
#   * the CHECK decides, never the agent's promise — a session claiming FIXED
#     without fixing anything must not open the gate
#   * a gate that repairs lets the phase continue; one that cannot stops it
#   * repair attempts are bounded per gate and per phase
#   * every outcome is written to the progress file, which is the whole point:
#     the failure this replaces was invisible there
#
# Run with: npx bats ralph/ralph-gates.test.bats

setup() {
  TMP="$BATS_TEST_TMPDIR/t"
  mkdir -p "$TMP"
  export STATE_DIR="$TMP/.state"
  export RALPH_RUN_ID="TESTRUN"
  export HOME="$TMP/home"
  mkdir -p "$HOME"

  set --
  # shellcheck disable=SC1090
  source "$BATS_TEST_DIRNAME/ralph-lib.sh"
  # shellcheck disable=SC1090
  source "$BATS_TEST_DIRNAME/ralph-gates.sh"

  RUN_DIR="$STATE_DIR/runs/TESTRUN"
  PROGRESS="$RUN_DIR/progress.txt"
  : > "$PROGRESS"

  # A stand-in for the session runner. Records the prompt it was given and sets
  # the promise the test wants, without spending a real session.
  SESSIONS="$TMP/sessions.txt"
  : > "$SESSIONS"
  run_iteration() {
    printf '%s\n' "$1" >> "$SESSIONS"
    cp "$2" "$TMP/last-prompt.txt"
    ITER_PROMISE="${FAKE_PROMISE:-FIXED}"
    # The repair the fake agent performs, if the test asked for one.
    [ -n "${FAKE_FIX_AFTER:-}" ] &&
      [ "$(wc -l < "$SESSIONS")" -ge "$FAKE_FIX_AFTER" ] && : > "$TMP/fixed"
    return 0
  }

  # A gate whose health is a file on disk, so a test can decide when it heals.
  gate_probe_desc="the probe file exists"
  gate_probe_check() { [ -f "$TMP/fixed" ]; }
  gate_probe_diag()  { echo "probe diagnostics: missing $TMP/fixed"; }
}

sessions_run() { wc -l < "$SESSIONS" | tr -d ' '; }

# ── the happy path ───────────────────────────────────────────────────────────

@test "a gate that already holds runs no repair session at all" {
  : > "$TMP/fixed"
  run run_gates qa probe
  [ "$status" -eq 0 ]
  [ "$(sessions_run)" -eq 0 ]
}

@test "a repaired gate lets the phase continue" {
  FAKE_FIX_AFTER=1
  run_gates qa probe
  [ "$?" -eq 0 ]
  [ "$(sessions_run)" -eq 1 ]
  grep -q "repaired after 1 attempt" "$PROGRESS"
}

@test "a gate needing two attempts still opens" {
  FAKE_FIX_AFTER=2
  run_gates qa probe
  [ "$?" -eq 0 ]
  [ "$(sessions_run)" -eq 2 ]
  grep -q "still failing after attempt 1" "$PROGRESS"
  grep -q "repaired after 2 attempt" "$PROGRESS"
}

# ── the check is the only source of truth ────────────────────────────────────

@test "an agent claiming FIXED without fixing anything does NOT open the gate" {
  FAKE_PROMISE=FIXED          # it says so...
  unset FAKE_FIX_AFTER        # ...but never touches the probe
  run run_gates qa probe
  [ "$status" -eq 1 ]
  grep -q "REQUIRED and could not be repaired" "$PROGRESS"
}

@test "an agent that fixed it but forgot the promise tag still counts as fixed" {
  FAKE_PROMISE=""             # no tag at all
  FAKE_FIX_AFTER=1
  run_gates qa probe
  [ "$?" -eq 0 ]
  grep -q "repaired after 1 attempt" "$PROGRESS"
}

@test "UNFIXABLE stops the retries early instead of burning the budget" {
  FAKE_PROMISE=UNFIXABLE
  run run_gates qa probe
  [ "$status" -eq 1 ]
  [ "$(sessions_run)" -eq 1 ]   # not GATE_MAX_REPAIRS
}

# ── bounds ───────────────────────────────────────────────────────────────────

@test "repair attempts per gate are capped" {
  GATE_MAX_REPAIRS=2
  run run_gates qa probe
  [ "$status" -eq 1 ]
  [ "$(sessions_run)" -eq 2 ]
}

@test "a phase-wide ceiling stops several broken gates from running away" {
  # Optional, because a required gate returns as soon as it cannot be repaired
  # and the run never reaches a second one — the phase ceiling is the backstop
  # for the case where the loop DOES keep going.
  gate_a_check() { false; }; gate_a_desc="a"; gate_a_diag() { echo a; }
  gate_b_check() { false; }; gate_b_desc="b"; gate_b_diag() { echo b; }
  GATE_OPTIONAL="a b"
  GATE_MAX_REPAIRS=2
  GATE_MAX_TOTAL=3
  run_gates qa a b
  # 2 attempts on a, then only 1 on b before the phase ceiling bites
  [ "$(sessions_run)" -eq 3 ]
  grep -q "repair budget for this phase is spent" "$PROGRESS"
}

@test "a required gate returns before spending the rest of the phase budget" {
  gate_a_check() { false; }; gate_a_desc="a"; gate_a_diag() { echo a; }
  gate_b_check() { false; }; gate_b_desc="b"; gate_b_diag() { echo b; }
  GATE_MAX_REPAIRS=2
  run run_gates qa a b
  [ "$status" -eq 1 ]
  [ "$(sessions_run)" -eq 2 ]   # gate b is never reached
}

# ── required vs optional ─────────────────────────────────────────────────────

@test "a required gate that cannot be repaired stops the phase" {
  run run_gates qa probe
  [ "$status" -eq 1 ]
}

@test "an optional gate that cannot be repaired lets the phase continue, with the shortfall recorded" {
  GATE_OPTIONAL="probe"
  run_gates qa probe
  [ "$?" -eq 0 ]
  [ "$GATE_SHORTFALL" = "probe" ]
  grep -q "optional and stayed broken" "$PROGRESS"
}

@test "one optional gate failing does not excuse a required one" {
  gate_hard_check() { false; }; gate_hard_desc="hard"; gate_hard_diag() { echo h; }
  GATE_OPTIONAL="probe"
  run run_gates qa probe hard
  [ "$status" -eq 1 ]
}

# ── narration: the blind spot this exists to close ───────────────────────────

@test "every gate failure is written to the progress file" {
  run run_gates qa probe
  grep -q "probe FAILED — the probe file exists" "$PROGRESS"
  grep -q "repairing probe (attempt 1/" "$PROGRESS"
}

@test "diagnostics are captured to a file and named in the progress file" {
  run run_gates qa probe
  [ -f "$RUN_DIR/diag-probe-1.txt" ]
  grep -q "probe diagnostics" "$RUN_DIR/diag-probe-1.txt"
  grep -q "diag-probe-1.txt" "$PROGRESS"
}

# ── the repair prompt ────────────────────────────────────────────────────────

@test "the repair prompt carries the requirement, the diagnostics and its own instructions" {
  run_gates qa probe || true
  P="$TMP/last-prompt.txt"
  grep -q "@ralph/prompt-repair.md" "$P"
  grep -q "GATE: probe" "$P"
  grep -q "the probe file exists" "$P"
  grep -q "probe diagnostics" "$P"
  grep -q "FIXED" "$P"
}

@test "the repair prompt never pulls in the QA agent's prompt or context" {
  run_gates qa probe || true
  P="$TMP/last-prompt.txt"
  # QA's own prompt and context must stay exactly as they were: this is a
  # different agent with a different job.
  ! grep -q "prompt-qa.md" "$P"
  ! grep -q "report-qa.json" "$P"
  ! grep -q "CLONE_URL" "$P"
}

@test "the repair agent is told not to touch what records verification" {
  run_gates qa probe || true
  grep -q "prd.json" "$TMP/last-prompt.txt"
  grep -qi "not trusted" "$TMP/last-prompt.txt"
}

# ── hooks are optional ───────────────────────────────────────────────────────

@test "a gate with no diag or reset hook still works" {
  gate_bare_check() { [ -f "$TMP/bare" ]; }
  gate_bare_desc="bare"
  FAKE_PROMISE=FIXED
  run run_gates qa bare        # no gate_bare_diag, no gate_bare_reset
  [ "$status" -eq 1 ]          # never healed, but nothing exploded
  [ -f "$RUN_DIR/diag-bare-1.txt" ]
}

@test "reset runs before the check so a repair can be picked up" {
  gate_reset_probe_desc="needs a reset to be seen"
  gate_reset_probe_check() { [ -f "$TMP/seen" ]; }
  gate_reset_probe_reset() { [ -f "$TMP/fixed" ] && cp "$TMP/fixed" "$TMP/seen"; return 0; }
  gate_reset_probe_diag() { echo d; }
  FAKE_FIX_AFTER=1
  run_gates qa reset_probe
  [ "$?" -eq 0 ]
}
