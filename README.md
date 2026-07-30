# Ralph

A loop that runs itself, so you can be *on* the loop instead of in it.

Ralph is a script. It starts a fresh worker, lets it do exactly one thing, writes
down what changed, and then starts over. It repeats that until there is nothing
left to do.

---

## The problem it solves

The obvious way to hand a large job to an agent is to point one at the whole
thing and let it run until it is done. It starts well. It rarely ends well.

Everything it has seen stays with it. The longer it works, the more it is
carrying, and the less room is left for the thing actually in front of it. Early
decisions get forgotten. Later ones contradict them. Three failures follow:

- **It drifts.** Work done late no longer matches the decisions made early.
- **It stalls quietly.** A worker that is stuck looks exactly like a worker that
  is busy.
- **It loses everything.** One interruption and hours of thinking are gone, with
  nothing to pick back up.

The limit is not skill. It is stamina.

---

## In the loop vs. on the loop

**In the loop**, you are a step in the work. Nothing moves unless you move it.
You answer the question, make the call, start the next piece. The work runs at
exactly your speed, and stops dead the moment you look away. Your attention is
the bottleneck, and it fills up your context window.

**On the loop**, it runs without you. You read what it is doing, decide if it is
heading the right way, and change what it was asked for. You step in because you
want to, with a closed loop. You trust it will iteratively get to the specs you
pointed it at.

Ralph's job is not to make you faster at the work. It is to get you out of the
middle of it.

---

## How it works

Ralph never carries the whole job. It runs one short pass, declares progress, and
starts again clean, with the plan of what's still left to do.

```mermaid
flowchart LR
    NEW["A fresh Ralph<br/>clean head"]
    PICK["Picks the one thing<br/>that matters most now"]
    WORK["Does that<br/>one thing"]
    WRITE["Writes down<br/>what changed"]
    MORE{"Anything<br/>left?"}
    DONE(["Finished"])
    MEM[("What has been<br/>done so far")]

    NEW --> PICK
    PICK --> WORK
    WORK --> WRITE
    WRITE --> MORE
    MORE -- "yes, go again" --> NEW
    MORE -- "no" --> DONE
    MEM -. "says where things stand" .-> PICK
    WRITE -. "adds to it" .-> MEM

    MEM ~~~ WORK

    classDef mem fill:#0d2430,stroke:#38bdf8,stroke-width:1.5px,color:#d8f3ff
    class MEM mem
    linkStyle 6,7 stroke:#38bdf8,color:#7dd3fc
```

Nothing important lives only inside the worker, and no pass lasts long enough to
go bad.

---

## What makes it work

**Start empty, every time.** Each pass begins with a worker that remembers
nothing. What it needs to know is not in its head, it is written down where it
can go and read it. A worker that never accumulates never degrades: the hundredth
pass is as sharp as the first, however long the job runs.

**Exactly one thing per pass.** Not "as much as you can manage", one. It gets
finished and written down, or the pass does not count. That keeps every pass
short enough to stay sharp, makes progress countable rather than a feeling, and
means a bad pass costs one item instead of the whole job.

**Say what you are doing.** The worker keeps up a running commentary while it
works, printing to the run's progress file. Working quietly is not an option.
From outside, hard thinking and total deadlock look exactly the same. A written
trail is the difference between knowing and guessing, and it is what the next
worker reads to catch up.

**End with one of two answers.** Every pass finishes by declaring either *there
is more left* or *everything is done*, never something in between, never
something that needs interpreting. That single word is what lets the loop carry
on by itself, with nobody standing over it.

**It is just a script.** It runs a pass, it writes to the run's progress file,
and it commits when a pass finishes its one thing. That is the entire apparatus.
Everything that makes it work is in the shape of the pass, not the plumbing
around it, which is why it travels. Anything you can break into small pieces that
can be finished one at a time and checked when done can be run this way.

---

## Build mode

Told to build, Ralph reads two things before every pass. Between them they answer
the only two questions it has: what am I making, and what am I doing next.

**The specs.** Your vision of the product: how it should look, how it should
behave, what the rules are, what counts as correct. This is what pins your vision
down, and the reason a hundred separate passes add up to one coherent thing.

**The plan.** That same product broken into pieces and put in order, each one
small enough to finish in a single pass and clear enough to tell when it is. It
doubles as the scoreboard: finished pieces get marked off.

---

## Where the specs and the plan come from

There are multiple ways to get them. Here is one.

Change the prompt and Ralph stops building. It works through an existing product
one page at a time instead, and what it writes down is the specs and the plan.
Same loop, same short passes. The looking is the work:

| | |
|---|---|
| **Read** | everything the product says about itself |
| **Map** | every place you can get to, and what is left to visit |
| **Open** | one page per pass: click it, type in it, submit it, record how it behaves |
| **Settle** | turn all of it into the specs and the plan, in build order |

**This only applies if you are copying something.** Looking at a product only
makes sense when a product already exists. If what you want is your own idea, you
never need it. Describe it to Claude, argue about it, change your mind, and have
it write the specs and the plan out of that conversation. Nothing to inspect,
nothing to copy.

Ralph never asks where they came from. It only needs each piece to be small
enough to finish in one pass and clear enough to check.

---

## Running it

```bash
make check      # typecheck + lint/format
make test       # unit tests
make test-e2e   # end-to-end tests (needs the dev server)
npm run dev     # start the app
```

---

*Educational purposes only.*
