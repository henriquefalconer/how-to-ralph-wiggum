#!/bin/bash
# ralph-gates.sh — preconditions a phase needs, repaired by an agent instead of
# being fatal.
#
# Sourced, never executed. Source it AFTER ralph-lib.sh: it is built on
# run_iteration, note and fail_phase.
#
# The problem it solves: a phase's preconditions are infrastructure, not product.
# "the dev server answers on :3015" is not a feature anyone wrote, but when it
# fails the phase that needs it cannot start — and a `exit 1` there spends one of
# the watchdog's three QA attempts on a condition an agent could have fixed in a
# minute. Three of those end the run with every feature unverified. Measured
# once: a stale .next cache replaying a compile error, then an unapplied
# migration, neither of which QA itself had any way to report.
#
# A gate is a named precondition with four parts, any of which may be omitted
# except the check:
#
#   gate_<name>_desc     one line: what must be true, in plain words
#   gate_<name>_check    exit 0 when satisfied. The ONLY source of truth.
#   gate_<name>_diag     prints evidence for the repair agent (logs, ports, git)
#   gate_<name>_reset    re-establish before re-checking (e.g. restart a server)
#
# run_gates then runs each check, and on failure hands the repair agent the
# gate's description and diagnostics — never a fix. What is wrong and how to fix
# it is the agent's problem to work out from the evidence, which is what keeps
# this generic: the same gate handles a stale cache, an unapplied migration, a
# bound port and a syntax error without knowing any of them exist.
#
# Two rules make a repair agent safe to run immediately before verification:
#
#   * The check is the only source of truth. A repair session reporting FIXED
#     proves nothing; run_gates re-runs the check itself. This is the same
#     stance ralph-qa.sh takes with its qa-complete sentinel — positive proof,
#     never the absence of a complaint.
#   * A repair agent must not touch verification state. prompt-repair.md forbids
#     prd.json, report-qa.json and the sentinels, because "repair" must never
#     become a route to marking features as passing.

GATE_MAX_REPAIRS="${RALPH_GATE_MAX_REPAIRS:-2}"    # attempts per gate
GATE_MAX_TOTAL="${RALPH_GATE_MAX_TOTAL:-6}"        # repair sessions per phase
GATE_REPAIRS_USED=0

# Gates listed here may fail without stopping the phase. Everything else is
# required: unrepairable means the phase aborts rather than reporting a result
# it cannot stand behind.
GATE_OPTIONAL="${RALPH_GATE_OPTIONAL:-}"

GATE_SHORTFALL=""      # optional gates that stayed broken, for the caller

gate_is_optional() { # <name>
  local g
  for g in $GATE_OPTIONAL; do [ "$g" = "$1" ] && return 0; done
  return 1
}

# A gate need not define every hook; these stand in when it does not.
gate_hook() { # <name> <hook> — run gate_<name>_<hook> if it exists
  local fn="gate_${1}_${2}"
  declare -F "$fn" >/dev/null || return 0
  "$fn"
}

gate_desc() { # <name>
  local var="gate_${1}_desc"
  printf '%s' "${!var:-$1}"
}

# repair_prompt <gate> <attempt> <diag-file> — the repair agent's prompt.
#
# Deliberately NOT the QA prompt with an extra paragraph: this is a different
# agent with a different job, and QA's own prompt and context stay exactly as
# they were. QA is never told a repair happened, because by the time it runs the
# precondition is simply true.
repair_prompt() { # <gate> <attempt> <diag-file> -> path to prompt file
  local gate="$1" attempt="$2" diag="$3"
  local pf="$RUN_DIR/prompt-repair-$gate-$attempt.txt"
  {
    cat <<PROMPT
@ralph/prompt-repair.md @CLAUDE.md

GATE: $gate
REQUIREMENT: $(gate_desc "$gate")
ATTEMPT: $attempt of $GATE_MAX_REPAIRS
PROGRESS: $PROGRESS
VERIFY_WITH: $(declare -f "gate_${gate}_check" 2>/dev/null | sed -n '2,$p' | tr '\n' ' ')

A phase cannot start until the requirement above holds. Diagnose it from the
evidence below and the repository itself, fix the cause, and stop.

## Orchestrator notes (these refine, never override, the instructions above)
- This is repair attempt $attempt. You are a fresh, clean-context session. All continuity is on disk ($PROGRESS, git history, the diagnostics below).
- Fix the CAUSE, not the symptom. Do not edit the check to make it pass, and do not disable, skip or weaken any test, gate or guard.
- Do NOT touch prd.json, report-qa.json or anything under ralph/.state — they record what has been verified, and you are not verifying anything.
- Your claim that it is fixed is not trusted: the orchestrator re-runs the check itself. Say UNFIXABLE rather than guessing.
- This session is terminated after $WATCHDOG seconds with no append to $PROGRESS. Narrate as you go.
- Your final message is parsed for the promise tag ONLY: end with <promise>FIXED</promise> or <promise>UNFIXABLE</promise> and stop.

## Diagnostics
\`\`\`
PROMPT
    cat "$diag" 2>/dev/null
    printf '```\n'
  } > "$pf"
  printf '%s' "$pf"
}

# run_gates <phase> <gate...> — satisfy every gate, repairing what is broken.
#
# Returns 0 when every required gate holds (optional ones that stayed broken are
# listed in GATE_SHORTFALL), 1 when a required gate could not be repaired.
run_gates() { # <phase> <gate...>
  local phase="$1"; shift
  local gate attempt diag pf ok
  GATE_SHORTFALL=""

  for gate in "$@"; do
    gate_hook "$gate" reset
    if gate_hook "$gate" check; then
      say "gate [$gate] ok"
      continue
    fi

    note "[ralph gate] $gate FAILED — $(gate_desc "$gate")"

    ok=0
    for ((attempt = 1; attempt <= GATE_MAX_REPAIRS; attempt++)); do
      # A per-phase ceiling as well as a per-gate one: several gates each
      # failing twice is a broken tree, not something to keep spending on.
      if [ "$GATE_REPAIRS_USED" -ge "$GATE_MAX_TOTAL" ]; then
        note "[ralph gate] repair budget for this phase is spent ($GATE_MAX_TOTAL sessions) — not attempting $gate again."
        break
      fi
      GATE_REPAIRS_USED=$((GATE_REPAIRS_USED + 1))

      diag="$RUN_DIR/diag-$gate-$attempt.txt"
      { printf '$ gate_%s_diag\n' "$gate"; gate_hook "$gate" diag; } > "$diag" 2>&1

      note "[ralph gate] repairing $gate (attempt $attempt/$GATE_MAX_REPAIRS) — diagnostics in $diag"
      pf="$(repair_prompt "$gate" "$attempt" "$diag")"
      run_iteration "repair-$gate-$attempt" "$pf" 'FIXED|UNFIXABLE'

      # $ITER_PROMISE is advisory only. The check decides, so a session that
      # claimed FIXED without fixing anything fails here exactly like one that
      # admitted UNFIXABLE, and an agent that fixed it but forgot the tag still
      # counts as a success.
      gate_hook "$gate" reset
      if gate_hook "$gate" check; then
        note "[ralph gate] $gate repaired after $attempt attempt(s) (agent said ${ITER_PROMISE:-nothing})."
        ok=1
        break
      fi

      note "[ralph gate] $gate still failing after attempt $attempt (agent said ${ITER_PROMISE:-nothing})."
      [ "$ITER_PROMISE" = "UNFIXABLE" ] && break
    done

    if [ "$ok" = 1 ]; then
      continue
    fi

    if gate_is_optional "$gate"; then
      note "[ralph gate] $gate is optional and stayed broken — $phase continues with reduced coverage."
      GATE_SHORTFALL="${GATE_SHORTFALL:+$GATE_SHORTFALL }$gate"
      continue
    fi

    note "[ralph gate] $gate is REQUIRED and could not be repaired. Diagnostics: $RUN_DIR/diag-$gate-*.txt"
    return 1
  done

  return 0
}
