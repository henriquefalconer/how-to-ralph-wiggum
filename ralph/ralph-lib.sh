#!/bin/bash
# ralph-lib.sh — the session runner shared by all three phase loops.
#
# Sourced, never executed. It provides one thing: run a `claude -p` session,
# resume it if it ended without a promise, and write ONE usage entry per
# iteration into the run's single progress file.
#
# Ported from ralph/ralph in github.com/henriquefalconer/baud. The usage
# accounting, the resume-on-missing-promise logic and the process-group reaping
# are that script's, kept verbatim where possible so the measurements stay
# comparable; the comments explaining WHY are the original author's findings and
# are worth more than the code.
#
# Contract for a caller (see ralph-inspect.sh / ralph-build.sh / ralph-qa.sh):
#   RALPH_RUN_ID   set by ralph-to-ralph.sh so every phase of one run shares a
#                  directory and a progress file; generated here if a phase
#                  script is run standalone.
#   PROGRESS       the single run-wide file every agent and every usage entry
#                  appends to. Exported, so the agents can find it.
#
# Job control: every background job gets its OWN process group, and anything it
# spawns inherits that group. That is what makes a session's whole tree —
# including subagents it launched — addressable as one unit, both to wait for
# and to kill.
set -m

# ── run namespace ────────────────────────────────────────────────────────────
#
# Every invocation of ralph-to-ralph.sh writes into its own directory keyed by
# the UTC time it started. Session files are numbered from 001 within a run, so
# two runs sharing one flat directory would silently overwrite each other's
# transcripts — namespacing removes that entirely.
STATE_DIR="${STATE_DIR:-ralph/.state}"
RALPH_RUN_ID="${RALPH_RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)}"
RUN_DIR="$STATE_DIR/runs/$RALPH_RUN_ID"
PROGRESS="${RALPH_PROGRESS:-$RUN_DIR/progress.txt}"
export RALPH_RUN_ID RALPH_PROGRESS="$PROGRESS"

MODEL="${RALPH_MODEL:-claude-sonnet-5}"
WATCHDOG="${RALPH_WATCHDOG_SECS:-1800}"   # kill a session after N s with no PROGRESS append (0 disables)
GROUP_WAIT_MAX="${RALPH_GROUP_WAIT_MAX:-900}"
RESUME_MAX="${RALPH_RESUME_MAX:-4}"       # resumes allowed within one iteration
BUDGET_USD="${RALPH_MAX_BUDGET_USD:-}"

mkdir -p "$RUN_DIR"
touch "$PROGRESS"

CLAUDE_ARGS=( -p --dangerously-skip-permissions --chrome --model "$MODEL" --output-format json )
[[ -n "$BUDGET_USD" ]] && CLAUDE_ARGS+=( --max-budget-usd "$BUDGET_USD" )

# Sessions are numbered across the WHOLE run, not per phase: each phase is its
# own process, so an in-memory counter would restart at 001 three times over and
# collide the transcripts the run directory exists to keep apart.
SESSION_COUNTER="$RUN_DIR/.session-counter"
[ -f "$SESSION_COUNTER" ] || echo 0 > "$SESSION_COUNTER"

RESULT_FILE="$RUN_DIR/last-result.txt"
COST_FILE="$RUN_DIR/costs.txt"
[ -f "$COST_FILE" ] || : > "$COST_FILE"

# ── small helpers ────────────────────────────────────────────────────────────

say()  { printf '[ralph %s] %s\n' "$(date -u +%H:%M:%S)" "$*" >&2; }

# Human session duration: "1h45min" over an hour, "45min" under. Measured on the
# wall clock in run_session — the session JSON's duration_ms is NOT usable (it
# reported 157840ms for a session that ran 31 minutes).
fmt_dur() { # <seconds>
  local s="${1:-0}" h m
  h=$(( s / 3600 )); m=$(( (s % 3600 + 30) / 60 ))
  (( m == 60 )) && { h=$(( h + 1 )); m=0; }
  if (( h > 0 )); then printf '%dh%02dmin' "$h" "$m"; else printf '%dmin' "$m"; fi
}
note() { printf '\n%s\n' "$*" >> "$PROGRESS"; }

# jsonfield <file> <dotted.path> — python3 stands in for jq, which is absent here.
jsonfield() {
  python3 - "$1" "$2" <<'PY'
import json, sys
try:
    d = json.load(open(sys.argv[1]))
except Exception:
    sys.exit(1)
for k in sys.argv[2].split('.'):
    if isinstance(d, dict) and k in d:
        d = d[k]
    else:
        sys.exit(1)
print(d if not isinstance(d, (dict, list)) else json.dumps(d))
PY
}

# promise_of <text> <alternation> — the three phases close on different tags
# (NEXT|INSPECT_COMPLETE, NEXT|COMPLETE, NEXT|QA_COMPLETE), so the accepted set
# is a parameter here where the reference could hardcode it.
promise_of() {
  grep -oE "<promise>(${2:-NEXT|COMPLETE})</promise>" <<<"${1:-}" | tail -1 |
    sed -E 's#</?promise>##g'
}

# ── usage accumulation ───────────────────────────────────────────────────────

SESSION_N=0
LAST_JSON=""
USAGE_DEFERRED=0
ITER_JSONS=()
ITER_SECS=0

# Start a fresh usage accumulation for one iteration.
begin_iteration_usage() { ITER_JSONS=(); ITER_SECS=0; USAGE_DEFERRED=1; }

# Emit the single ledger entry for the iteration just finished.
flush_iteration_usage() { # <label>
  USAGE_DEFERRED=0
  (( ${#ITER_JSONS[@]} )) || return 0
  SESSION_SECS="$ITER_SECS"
  log_usage "$1" "${ITER_JSONS[@]}"
  ITER_JSONS=(); ITER_SECS=0
}

spent_usd() { # total cost so far, summed from the ledger file
  python3 -c "
print(f\"{sum(float(l) for l in open('$COST_FILE') if l.strip()):.4f}\")" 2>/dev/null || echo 0
}

# ── process groups ───────────────────────────────────────────────────────────
#
# Stopping a phase must take its sessions with it. Without this a SIGTERM to the
# loop leaves the in-flight `claude -p` — and any subagent it spawned — running
# and reparented to init, still writing to the repo with nothing supervising it.
# Killing the process GROUP rather than the pid is what reaches the subagents.
SESSION_PGIDS=""

# `set -m` should give every background job its own process group. When it does
# not — a shell without job control — the "session group" is this script's own,
# and both waiting on it and killing it are catastrophic: await_group would find
# the loop itself as leftover work and wait the full GROUP_WAIT_MAX, then SIGTERM
# the run. Never treat our own group as a session's.
SELF_PGID="$(ps -o pgid= -p $$ 2>/dev/null | tr -d ' ')"
own_group() { [ -n "${1:-}" ] && [ "$1" = "$SELF_PGID" ]; }

group_members() { # <pgid> -> pids still alive in that group
  [ -n "${1:-}" ] || return 0
  own_group "$1" && return 0
  pgrep -g "$1" 2>/dev/null | tr '\n' ' '
}

reap_sessions() {
  local pgid members
  for pgid in $SESSION_PGIDS; do
    members="$(group_members "$pgid")"
    [ -n "$members" ] || continue
    say "stopping session group $pgid (${members% })"
    kill -TERM -"$pgid" 2>/dev/null || true
  done
  sleep 2
  for pgid in $SESSION_PGIDS; do
    [ -n "$(group_members "$pgid")" ] && kill -KILL -"$pgid" 2>/dev/null || true
  done
}

# After a session's own claude exits, subagents it spawned can still be running.
# Wait for them: their work lands in the repo, and letting the next iteration
# start on top of a half-written tree is how uncommitted work goes missing.
await_group() { # <pgid> <label>
  local pgid="${1:-}" label="${2:-}" waited=0 members
  [ -n "$pgid" ] || return 0
  members="$(group_members "$pgid")"
  [ -n "$members" ] || return 0
  say "session [$label] exited but left work running (${members% }) — waiting"
  note "[ralph] session [$label] exited with subagent work still running; waiting for it before the next iteration."
  while [ -n "$(group_members "$pgid")" ]; do
    sleep 5
    waited=$(( waited + 5 ))
    if (( waited >= GROUP_WAIT_MAX )); then
      say "still running after ${waited}s — terminating group $pgid"
      note "[ralph] leftover work in session [$label] did not finish within ${waited}s; terminated."
      kill -TERM -"$pgid" 2>/dev/null || true
      sleep 5
      kill -KILL -"$pgid" 2>/dev/null || true
      return 0
    fi
  done
  say "leftover work in [$label] finished after ${waited}s"
}

watchdog() { # <pid> <label>
  local pid="$1" label="$2" start last now idle
  start=$(date +%s)
  while kill -0 "$pid" 2>/dev/null; do
    sleep 30
    kill -0 "$pid" 2>/dev/null || return 0
    [[ "$WATCHDOG" -le 0 ]] && continue
    last=$(stat -c %Y "$PROGRESS" 2>/dev/null || echo "$start")
    (( last < start )) && last=$start
    now=$(date +%s); idle=$(( now - last ))
    if (( idle > WATCHDOG )); then
      say "watchdog: no $PROGRESS append in ${idle}s — terminating [$label]"
      note "[ralph watchdog] no progress append in ${idle}s — session [$label] SIGTERMed mid-work."
      local wpg; wpg="$(ps -o pgid= -p "$pid" 2>/dev/null | tr -d ' ')"
      if [ -n "$wpg" ]; then kill -TERM -"$wpg" 2>/dev/null; sleep 20; kill -KILL -"$wpg" 2>/dev/null
      else kill -TERM "$pid" 2>/dev/null; sleep 20; kill -KILL "$pid" 2>/dev/null; fi
      return 1
    fi
  done
}

# Usage accounting. Self-contained: the python below reads the session JSON that
# `claude -p --output-format json` wrote and, from it, that session's transcript
# and its subagents' transcripts.
#
# WHAT IS EXACT AND WHAT IS NOT (measured against the server 2026-07-24):
#   cost and per-model totals come from the session JSON (total_cost_usd,
#   modelUsage) — server-computed, already covering subagents and thinking tokens.
#   Context, input and cache figures are read from the transcripts and match the
#   server exactly. Output tokens do NOT: with thinking display omitted (the
#   default on Opus 5 / Sonnet 5) thinking blocks are written with empty text and
#   no field carries their count, so a subagent showed 149 recorded output tokens
#   against 9,481 billed. Output is therefore never reported per subagent.
#
# Context size for one inference call is input + cache_read + cache_creation:
# every prompt token is billed exactly once into one of those three buckets, so
# their sum is the whole prompt the model saw. Peak across calls is the headline;
# a mid-session DROP means auto-compaction fired, which is worth seeing in the log.
# log_usage <label> <json-file>... — one entry per ITERATION, not per invocation.
# A resumed turn writes its own session JSON with its own total_cost_usd covering
# only that turn (measured: $0.1008 for the first turn, $0.0150 for the resume), so
# the cost and modelUsage figures are SUMMED across every JSON of the iteration. The
# transcript is not: --resume appends to the same ~/.claude/projects/<cwd>/<sid>.jsonl,
# so context peak and inference-call count are already whole-iteration figures and are
# read from the last JSON's session_id alone.
log_usage() {
  local label="$1"; shift
  local f cost="" any=0
  for f in "$@"; do
    [ -f "$f" ] || continue
    cost=$(jsonfield "$f" total_cost_usd 2>/dev/null || echo "")
    [[ -n "$cost" ]] && any=1
  done
  (( any )) || return 0
  {
    printf '\n## %s UTC (%s) - Session usage — %s [%s]\n' \
      "$(date -u +%Y-%m-%dT%H:%M:%S)" "$(fmt_dur "${SESSION_SECS:-0}")" "$label" "$MODEL"
    python3 - "$@" <<'PY'
import glob, json, os, sys

# The context window is NOT hardcoded: the session JSON reports it per model as
# modelUsage[<model>].contextWindow (verified 2026-07-24: sonnet-5 and opus-5[1m]
# 1000000, haiku-4-5 200000). A model absent from that map prints the raw peak
# with no percentage rather than guessing.

def base(model):
    """Strip the [1m] variant marker and any -YYYYMMDD snapshot suffix."""
    m = (model or "").split("[")[0]
    parts = m.rsplit("-", 1)
    return parts[0] if len(parts) == 2 and parts[1].isdigit() and len(parts[1]) == 8 else m

def short(model):
    """Display name: drop the claude- prefix and any date snapshot, but KEEP a
    [1m] variant marker — it distinguishes the 1M-context deployment."""
    m = model or ""
    variant = "[1m]" if "[1m]" in m else ""
    return base(m).replace("claude-", "") + variant

def calls(path):
    """Per-inference-call usage, deduplicated by message id — a transcript writes
    one line per content block and every line repeats the same usage object."""
    seen, out = set(), []
    try:
        fh = open(path, errors="replace")
    except OSError:
        return out
    with fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except ValueError:
                continue  # a partially-flushed final line
            msg = rec.get("message")
            if not (isinstance(msg, dict) and isinstance(msg.get("usage"), dict)):
                continue
            key = msg.get("id") or rec.get("requestId")
            if key is None or key in seen:
                continue
            seen.add(key)
            u = msg["usage"]
            out.append({
                "model": msg.get("model"),
                "in": u.get("input_tokens") or 0,
                "cr": u.get("cache_read_input_tokens") or 0,
                "cw": u.get("cache_creation_input_tokens") or 0,
            })
    return out

metas = []
for path in sys.argv[1:]:
    try:
        metas.append(json.load(open(path)))
    except (OSError, ValueError):
        pass
if not metas:
    sys.exit(0)
# The last invocation identifies the session; every one of them carries cost.
meta = metas[-1]
sid = meta.get("session_id")
if not sid:
    sys.exit(0)
root = os.path.join(os.path.expanduser("~"), ".claude", "projects",
                    (meta.get("cwd") or os.getcwd()).replace("/", "-"))

# num_turns and duration_ms are deliberately NOT reported: on a 31-minute session
# with 109 inference calls the server reported num_turns=14 and duration_ms=157840
# (2.6 min). Neither could be reconciled with the transcript, so the ledger states
# only the inference-call count, which is derived and verifiable.
# Two independent cost figures live in the session JSON and they do NOT always
# agree: total_cost_usd is the session total, modelUsage[].costUSD is per model.
# They reconcile to the cent on sonnet-only sessions, but a session with an Opus
# subagent was measured at total_cost_usd $12.3886 against a modelUsage sum of
# $16.5541. Print the headline figure, and say so when the two disagree rather
# than emitting two contradictory numbers in one entry.
total = sum((m.get("total_cost_usd") or 0) for m in metas)
# Counters add across invocations; contextWindow and maxOutputTokens are fixed
# properties of the model and must NOT (summing them reported a 1M window as "2M"
# and halved the percentage).
NON_ADDITIVE = {"contextWindow", "maxOutputTokens"}
mu = {}
for m in metas:
    for model, d in (m.get("modelUsage") or {}).items():
        acc = mu.setdefault(model, {})
        for k, v in d.items():
            if isinstance(v, (int, float)) and k not in NON_ADDITIVE:
                acc[k] = acc.get(k, 0) + v
            else:
                acc[k] = v
mu_sum = sum((m.get("costUSD") or 0) for m in mu.values())
# Only meaningful when per-model data exists — an absent modelUsage sums to 0
# and would otherwise report the whole cost as a discrepancy.
if mu and abs(mu_sum - total) >= 0.005:
    print(f"- cost ${total:.4f} (from claude -p; per-model sums to ${mu_sum:.4f}, "
          f"differs by ${mu_sum - total:+.4f})")
else:
    print(f"- cost ${total:.4f} (from claude -p)")

session = calls(os.path.join(root, sid + ".jsonl"))
if session:
    ctx = [c["in"] + c["cr"] + c["cw"] for c in session]
    peak = max(ctx)
    mu_all = mu
    last = session[-1]["model"]
    entry = mu_all.get(last) or next(
        (v for k, v in mu_all.items() if base(k) == base(last)), {})
    win = entry.get("contextWindow")
    of = pct = ""
    if win:
        of = f" of {win // 1_000_000}M" if win >= 1_000_000 else f" of {win // 1000}K"
        pct = f" ({round(peak * 100 / win)}%)"
    # Report the trajectory as measured, not a mechanism. Context normally only
    # grows; a sustained drop means something reclaimed it (auto-compaction or
    # context editing). No compaction event has been observed on this box, so the
    # drop is reported as an observation and not labelled as compaction.
    drops = sum(1 for i in range(1, len(ctx)) if ctx[i] < ctx[i - 1] * 0.8)
    shape = "monotonic" if not drops else f"{drops} drop(s), final {ctx[-1]:,}"
    # A resumed iteration produces one series from several processes. --resume
    # replays the conversation, so it normally keeps climbing — measured on a real
    # resume the series stayed monotonic (36,455 -> 36,797 -> 37,347). It is not
    # guaranteed to for a large context, though, and a step down at a resume
    # boundary would be an artifact of restarting, NOT context being reclaimed.
    # Say how many turns produced the series so a drop here is not read as
    # compaction.
    # Unconditional: flagged whether or not the series dipped, so "monotonic" alone
    # never hides that the iteration took more than one process to produce.
    if len(metas) > 1:
        shape += f", resumed {len(metas) - 1}x"
    print(f"- context {peak:,} tok peak{of}{pct} across {len(ctx)} inference calls, {shape}")

if mu:
    parts = []
    for model, d in sorted(mu.items(), key=lambda kv: -kv[1].get("costUSD", 0)):
        detail = (f" (in {d.get('inputTokens', 0):,} / out {d.get('outputTokens', 0):,}"
                  f" / cache-read {d.get('cacheReadInputTokens', 0):,})") if parts == [] else ""
        parts.append(f"{short(model)} ${d.get('costUSD', 0):.4f}{detail}")
    print("- models " + " · ".join(parts))

subs = sorted(glob.glob(os.path.join(root, sid, "subagents", "agent-*.jsonl")))
counts = {}
for path in subs:
    c = calls(path)
    if c:
        counts[short(c[-1]["model"])] = counts.get(short(c[-1]["model"]), 0) + 1
if counts:
    kinds = " · ".join(f"{m} x{n}" for m, n in sorted(counts.items(), key=lambda kv: -kv[1]))
    print(f"- subagents ({sum(counts.values())}) {kinds}")
PY
    printf -- '- transcript: %s\n' "$f"
  } >> "$PROGRESS"
  printf '%s\n' "$cost" >> "$COST_FILE"
}

# A `claude -p` turn that ends while a Bash task is still backgrounded takes that task
# down with it. Measured two ways: a `-p` session told to start a 45-second background
# job and end its turn immediately exited at 6s and the job's output file never appeared;
# and across the 13 sessions of run 20260727T053631Z await_group never once found a
# leftover process, while the gate runs those sessions had launched stopped dead at
# `00-warmup-build`. So "I'll wait for the background gate and resume automatically" is
# false under -p: the turn ending IS the process exiting, which kills the gate.
#
# The session is not broken, though — only stranded. `--resume` restores the whole
# conversation headlessly (verified: same session_id, full recall of what it had run),
# so it can re-run the one command in the foreground instead of redoing the iteration
# from nothing. That matters: the sessions lost this way had already spent $4-7 each.
resumable_session_id() { # <session-json> -> session id, if the run looks resumable
  local j="${1:-}" sid
  [ -f "$j" ] || return 1
  [ "$(jsonfield "$j" is_error 2>/dev/null)" = "True" ] && return 1
  sid="$(jsonfield "$j" session_id 2>/dev/null)" || return 1
  [ -n "$sid" ] && printf '%s' "$sid"
}

write_resume_prompt() { # <file>
  printf '%s\n' "Repeat the command without backgrounding it, then finish the iteration and end with <promise>NEXT</promise> or <promise>COMPLETE</promise>." > "$1"
}

# run_session <label> <prompt-file> [session-id] — writes the session's final
# text to $RESULT_FILE. Do NOT call inside $( ): wrapping it in a subshell would
# discard every variable it sets — session numbering would reset each call and
# collide transcripts, and the cost ledger would total $0.
run_session() {
  local label="$1" pf="$2" sid="${3:-}" out rc pid pgid t0
  local -a resume_args=()
  [ -n "$sid" ] && resume_args=( --resume "$sid" )
  SESSION_N=$(( $(cat "$SESSION_COUNTER" 2>/dev/null || echo 0) + 1 ))
  echo "$SESSION_N" > "$SESSION_COUNTER"
  t0=$(date +%s)
  out="$RUN_DIR/$(printf '%03d' "$SESSION_N")-$label.json"
  LAST_JSON="$out"
  if [ -n "$sid" ]; then
    say "session $SESSION_N [$label] RESUMING $sid (model=$MODEL)"
  else
    say "session $SESSION_N [$label] starting (model=$MODEL)"
  fi
  claude "${CLAUDE_ARGS[@]}" ${resume_args[@]+"${resume_args[@]}"} < "$pf" > "$out" 2> "$out.err" &
  pid=$!
  pgid="$(ps -o pgid= -p "$pid" 2>/dev/null | tr -d ' ')"
  [ -n "$pgid" ] && SESSION_PGIDS="$SESSION_PGIDS $pgid"
  watchdog "$pid" "$label"
  wait "$pid"; rc=$?
  # `wait` returns when THIS claude exits; subagents it spawned live on.
  await_group "$pgid" "$label"
  SESSION_SECS=$(( $(date +%s) - t0 ))   # read by log_usage for the header
  ITER_JSONS+=( "$out" )
  ITER_SECS=$(( ITER_SECS + SESSION_SECS ))
  # A deferred caller (a phase loop, which may resume this same session several
  # times) logs once for the whole iteration instead of once per invocation.
  if (( USAGE_DEFERRED )); then
    :
  else
    log_usage "$label" "$out"
  fi
  (( rc != 0 )) && say "session [$label] exited rc=$rc — see $out.err"
  jsonfield "$out" result > "$RESULT_FILE" 2>/dev/null || : > "$RESULT_FILE"
  return 0
}

# run_iteration <label> <prompt-file> <promise-alternation> — one iteration:
# the first session plus a resume for each time it ends its turn on a
# backgrounded command. They are one unit of work on one session id, so usage is
# accumulated and written once, at the end, instead of once per invocation.
#
# The promise comes back in $ITER_PROMISE, NOT on stdout, for the same reason
# run_session uses $RESULT_FILE: a caller writing `p="$(run_iteration ...)"` runs
# the whole thing in a subshell, which discards every variable it sets —
# $LAST_JSON and $RESUMES_USED would read stale in the caller. Worse, under
# `set -m` that subshell gets its OWN process group, so the session inherits the
# subshell's group and await_group finds the still-running subshell as a "leftover
# subagent" — it then waits the full GROUP_WAIT_MAX and SIGTERMs its own caller.
# Call it as a statement and read $ITER_PROMISE.
ITER_PROMISE=""
RESUMES_USED=0
run_iteration() {
  local label="$1" pf="$2" alt="$3" out p sid rp tries=0

  begin_iteration_usage
  run_session "$label" "$pf"
  out="$(cat "$RESULT_FILE")"
  p="$(promise_of "$out" "$alt")"

  # A missing tag almost always means the turn ended waiting on a command that -p
  # then killed. Resuming costs one short turn and keeps everything the session
  # already did; restarting the slot throws all of it away. Bounded only to stop a
  # session that cannot finish from looping forever.
  while [[ -z "$p" ]] && (( tries < RESUME_MAX )); do
    sid="$(resumable_session_id "$LAST_JSON")" || break
    [ -n "$sid" ] || break
    tries=$((tries + 1))
    say "iteration [$label]: no promise tag — resuming session $sid (resume $tries/$RESUME_MAX)"
    rp="$RUN_DIR/prompt-resume-$label-$tries.txt"
    write_resume_prompt "$rp"
    run_session "$label" "$rp" "$sid"
    out="$(cat "$RESULT_FILE")"
    p="$(promise_of "$out" "$alt")"
  done

  RESUMES_USED="$tries"
  flush_iteration_usage "$label"
  ITER_PROMISE="$p"
}
