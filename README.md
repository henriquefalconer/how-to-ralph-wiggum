# Ralph

*Let Ralph ralph.*

A loop that runs itself, so you can be *on* the loop instead of in it.

Point it at the work, walk away, and check in.

---

## Be on the loop, not in it

**In the loop (interactive Claude)**, you are a step in the work. Nothing moves
unless you move it, so it runs at exactly your speed and stops the moment you
look away. Your attention is the bottleneck, and it fills up your context window.

**On the loop (Ralph)**, it runs without you. You read what it is doing, decide
whether it is going the right way, and change what it was asked for. You step in
because you want to, with a closed loop.

Ralph's job is not to make you faster at the work. It's to get you out of the
middle of it and puts you above it.

---

## How Ralph works

Ralph never carries the whole job. It runs one short pass, declares progress,
then starts clean again with the plan of what is left.

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

Designed to not fill up your context window.

---

## What Ralph needs

The specs and the plan, read before every pass. Between them they answer the
only two questions it has: what am I making, and what am I doing next.

**The specs** are your vision of the product, written down. How it looks, how it
behaves, what counts as correct. This is what pins the vision in place, and it is
why a hundred separate passes add up to one coherent thing.

**The plan** is that same product split into pieces and put in order, each small
enough to finish in a single pass. It doubles as the scoreboard, since finished
pieces get marked off as they go.

---

## Where the specs and the plan come from

There are multiple ways. Here is one.

Change the prompt and Ralph stops building. It works through an existing product
instead, one page per pass, and what it writes down is the specs and the plan.
Same loop, same short passes. The looking is the work.

That only applies if you are copying something. If the idea is your own, describe
it to Claude instead, have a discussion with it, and let it write the specs and
the plan out of that conversation.

---

*Start empty. Do one thing. Write it down. Go again.*

*Educational purposes only.*
