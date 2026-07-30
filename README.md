# Ralph

A loop that runs itself, so you can be *on* the loop instead of in it.

Ralph is a script. It starts fresh, does exactly one thing, writes down what
changed, and then starts over, until there is nothing left to do.

---

## Why

Point one agent at a whole job and let it run and it starts well, but rarely
ends well. Everything it has seen stays with it, so the longer it works the less
room is left for the thing in front of it. It drifts, it stalls quietly, and one
interruption loses the lot.

The limit is not skill. It is stamina.

**In the loop**, you are a step in the work. Nothing moves unless you move it,
and it stops dead the moment you look away. Your attention is the bottleneck, and
it fills up your context window.

**On the loop**, it runs without you. You read what it is doing and change what
it was asked for, stepping in because you want to, with a closed loop.

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

---

## What makes it work

**Start empty, every time.** What it needs to know is written down where it can
go and read it, not carried in its head. Something that never accumulates never
degrades: the hundredth pass is as sharp as the first.

**Exactly one thing per pass.** It gets finished and written down, or the pass
does not count. Progress becomes countable, and a bad pass costs one item rather
than the whole job.

**Say what you are doing.** Ralph narrates as it works, printing to the run's
progress file. From outside, hard thinking and total deadlock look identical, so
silence is not allowed.

**End with one of two answers.** Every pass declares either *there is more left*
or *everything is done*, never something needing interpretation. That is what
lets the loop carry on with nobody standing over it.

**It is just a script.** It runs a pass, writes to the progress file, and commits
when a pass finishes its one thing. Everything that makes it work is in the shape
of the pass, not the plumbing, which is why it travels.

---

## Build mode

Told to build, Ralph reads two things before every pass:

**The specs.** Your vision of the product: how it should look, how it should
behave, what counts as correct. This is what pins your vision down, and the
reason a hundred separate passes add up to one coherent thing.

**The plan.** That same product broken into pieces and put in order, each small
enough to finish in a single pass. It doubles as the scoreboard.

---

## Where those come from

There are multiple ways. Here is one.

Change the prompt and Ralph stops building. It works through an existing product
one page at a time instead, and what it writes down is the specs and the plan.
The looking is the work: **read** what the product says about itself, **map**
every place you can get to, **open** one page per pass and record how it behaves,
then **settle** all of it into the specs and the plan.

That only applies if you are copying something. If the idea is your own, describe
it to Claude and have it write the specs and the plan out of that conversation.
Ralph never asks where they came from.

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
