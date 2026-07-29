#!/bin/bash
# ralph-resume.sh — `--resume` / `--model` / `--list` argument handling, shared
# by every ralph script (the entry point, the watchdog, and each of the three
# phases).
#
# Sourced for its definitions only; it starts nothing and creates nothing.
# Source it BEFORE ralph-lib.sh, because it works by exporting RALPH_RUN_ID and
# MODEL, and the library reads both at source time — RALPH_RUN_ID to pick the
# run directory, MODEL to build the `claude` argument list.
#
# --model sets the model for every session the launch goes on to run. It is
# exported rather than forwarded as an argument, so the watchdog and all three
# phase scripts inherit it the same way they inherit RALPH_RUN_ID; no phase
# needs to know the flag exists.
#
# What resuming does and does not do:
#   The WORK always resumes on its own — prd.json, spec-build.md and the phase
#   sentinels live on disk, so any launch picks up where the last one stopped.
#   What a plain launch loses is the RUN: a new run id means a new progress
#   file, a cost ledger restarting at zero, and session numbering back at 001.
#   --resume keeps all three by reusing the run id. The phase is re-derived from
#   the state on disk and each phase's iteration counter starts again at 1 —
#   iteration numbers are per-invocation, while the run id is what ties a run's
#   sessions, spend and narration together.

RUNS_DIR="ralph/.state/runs"

# Every `|| true` here is load-bearing under `set -e`: on a fresh checkout
# $RUNS_DIR does not exist, and `ls` failing inside a pipeline would take the
# script down before it could print anything useful.
latest_run() { ls -1 "$RUNS_DIR" 2>/dev/null | sort | tail -1 || true; }

run_spend() { # <run-dir> -> total cost recorded so far
  python3 -c "
print(f\"{sum(float(l) for l in open('$1/costs.txt') if l.strip()):.4f}\")" 2>/dev/null || echo "0.0000"
}

run_target() { # <run-dir> -> the url the run was started against, if recorded
  cat "$1/target-url" 2>/dev/null || true
}

list_runs() {
  if [ -z "$(latest_run)" ]; then
    echo "No runs recorded under $RUNS_DIR."
    return 0
  fi
  echo "Runs under $RUNS_DIR (newest last):"
  local id dir sessions spent target
  for id in $(ls -1 "$RUNS_DIR" 2>/dev/null | sort || true); do
    dir="$RUNS_DIR/$id"
    sessions=$(cat "$dir/.session-counter" 2>/dev/null || echo 0)
    spent=$(run_spend "$dir")
    target=$(run_target "$dir")
    printf '  %s  %3s sessions  $%-9s %s\n' "$id" "$sessions" "$spent" "${target:-?}"
  done
  return 0
}

# parse_resume "$@" — consumes the leading flags every ralph script accepts:
# `--resume [run-id]`, `--model <name>` and `--list`, in any order. On --resume
# it exports RALPH_RUN_ID so ralph-lib.sh attaches to that run instead of
# minting a new one; on --model it exports MODEL, which ralph-lib.sh reads to
# build the `claude` argument list. Parsing stops at the first non-flag, so the
# positional arguments after it (target url, iteration budgets) are untouched.
#
# The caller's remaining arguments come back in RESUME_ARGS, because a function
# cannot shift its caller's positional parameters; use it as:
#
#     parse_resume "$@"; set -- ${RESUME_ARGS[@]+"${RESUME_ARGS[@]}"}
#
RESUMING=0
RESUME_ARGS=()
parse_resume() {
  RESUMING=0
  RESUME_ARGS=()
  local id=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --list)
        list_runs
        exit 0
        ;;
      --model)
        shift
        # A missing value would otherwise swallow the target url as a model
        # name and run every session against nonsense.
        if [ $# -eq 0 ] || [[ "$1" == -* ]]; then
          echo "--model needs a model name, e.g. --model claude-opus-5." >&2
          exit 1
        fi
        export MODEL="$1"; shift
        ;;
      --model=*)
        if [ -z "${1#--model=}" ]; then
          echo "--model needs a model name, e.g. --model claude-opus-5." >&2
          exit 1
        fi
        export MODEL="${1#--model=}"; shift
        ;;
      --resume)
        RESUMING=1
        shift
        if [ $# -gt 0 ] && [ -d "$RUNS_DIR/${1:-}" ]; then
          # An explicit run id.
          id="$1"; shift
        elif [ $# -gt 0 ] && [[ "$1" != *://* ]] && [[ "$1" != [0-9]* ]] && [[ "$1" != -* ]]; then
          # Looks like an id but names no run — refuse rather than silently
          # starting a fresh run under a name the user thought already existed.
          echo "No such run: $1" >&2
          echo "" >&2
          list_runs >&2
          exit 1
        else
          id="$(latest_run)"
          if [ -z "$id" ]; then
            echo "Nothing to resume — no runs under $RUNS_DIR." >&2
            exit 1
          fi
        fi
        export RALPH_RUN_ID="$id"
        ;;
      *)
        break
        ;;
    esac
  done
  RESUME_ARGS=( ${1+"$@"} )
}

# resume_banner — record in the run's progress file that it was picked up again,
# so the narration shows where one launch ended and the next began.
resume_banner() { # <progress-file> <what>
  printf '\n═══════════════════════════════════════════════════════\nRUN RESUMED %s UTC — %s continuing run %s\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%S)" "$2" "${RALPH_RUN_ID:-?}" >> "$1"
}
