# Ralph

*Let Ralph ralph.*

A loop that runs itself, so you can be *on* the loop instead of in it.

Point it at the work. Walk away. Check in.

---

## Be on the loop, not in it

**In the loop**, you are a step in the work. Nothing moves unless you move it.
Answer the question. Make the call. Start the next piece. The work runs at
exactly your speed, and stops dead the moment you look away. Your attention is
the bottleneck. It fills up your context window.

**On the loop**, it runs without you. You read what it is doing. You decide if it
is heading the right way. You change what it was asked for. You step in because
you want to, with a closed loop.

Ralph's job is not to make you faster at the work. It is to get you out of the
middle of it.

---

## How Ralph works

Ralph never carries the whole job. It runs one short pass. It declares progress.
Then it starts again clean, with the plan of what's still left to do.

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

No pass lasts long enough to fill up the context window.

---

## What Ralph needs

Told to build, Ralph reads two things before every pass. Between them they answer
its only two questions. What am I making? What am I doing next?

**The specs.** Your vision of the product. How it should look. How it should
behave. What counts as correct. This is what pins your vision down. It is the
reason a hundred separate passes add up to one coherent thing.

**The plan.** That same product broken into pieces and put in order. Each piece
is small enough to finish in a single pass. It doubles as the scoreboard.
Finished pieces get marked off.

---

## Where the specs and the plan come from

There are multiple ways to do that. Here is one.

Change the prompt and Ralph stops building. It works through an existing product
one page at a time instead. What it writes down is the specs and the plan. Same
loop. Same short passes. The looking is the work.

| | |
|---|---|
| **Read** | everything the product says about itself |
| **Map** | every place you can get to |
| **Open** | one page per pass, properly |
| **Settle** | all of it into the specs and the plan |

**Only if you are copying something.** Looking at a product only makes sense when
a product already exists. If the idea is your own, you never need it. Describe it
to Claude. Argue about it. Change your mind. Have it write the specs and the plan
out of that conversation.

Ralph never asks where they came from.

---

*Start empty. Do one thing. Write it down. Go again.*

*Educational purposes only.*
