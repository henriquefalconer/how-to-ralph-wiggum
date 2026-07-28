---
name: claude-in-chrome
description: "Claude in Chrome browser control reference — the MCP tools for driving the user's real Chrome window. Use this whenever a loop needs to inspect, click, type, screenshot, or debug a page in the browser."
---

# Claude in Chrome — Browser Control

Claude in Chrome drives the **user's existing Chrome window** through the
`mcp__claude-in-chrome__*` MCP tools. There is no shell CLI and no separate
session to start or stop — you act inside your own turn, in the window that is
already open and already signed in.

That last part is the whole point for this project: the target product's session
(and the `proton.me` mailbox that receives its confirmation links) already exists
in that window. Never log out, clear cookies, open an incognito/guest window, or
start a fresh profile — you will lose the session and the Inspect loop stalls.

## Loading the tools

The browser tools are deferred: their names are known but their schemas are not
loaded, so calling one before fetching it fails. Load **everything you expect to
need in a single `ToolSearch` call** — the `select:` query takes a comma-separated
list, and one call per tool wastes a round-trip each:

```
ToolSearch "select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__tabs_create_mcp"
```

Add task-specific tools to that same call when you already know you need them:
`read_console_messages` / `read_network_requests` for debugging, `form_input` for
forms, `get_page_text` for bulk text, `gif_creator` for recordings.

## Quick Start

```
tabs_context_mcp                      # what is already open (call this FIRST)
tabs_create_mcp                       # new tab — do not hijack the user's
navigate         { url }              # go to a page
read_page                             # structured view of the page
computer         { action: "screenshot" }
computer         { action: "left_click", coordinate: [x, y] }
```

## Core Workflow: read → act → read

1. **`read_page`** — structured snapshot of the current page
2. **Act** — `computer` click/type/scroll, `form_input`, `navigate`
3. **`read_page`** again — confirm what changed

Re-read after anything that changes the page (navigation, submit, a click that
opens a modal). A stale reading is the most common source of a wrong click.

## Session start-up

At the start of any browser work:

1. Call **`tabs_context_mcp`** to see the user's current tabs.
2. Only reuse an existing tab if the user explicitly asked for it.
3. Otherwise open your own with **`tabs_create_mcp`**.
4. Never reuse a tab ID from a previous session. If a tool reports an invalid or
   missing tab, call `tabs_context_mcp` again for fresh IDs.

## Tool Reference

### Tabs & navigation
| Tool | Purpose |
|---|---|
| `tabs_context_mcp` | List the user's tabs and their IDs. Call first. |
| `tabs_create_mcp` | Open a new tab to work in |
| `tabs_close_mcp` | Close a tab you opened |
| `navigate` | Navigate a tab to a URL |
| `resize_window` | Resize the browser window |

### Reading the page
| Tool | Purpose |
|---|---|
| `read_page` | Structured representation of the page — the default way to see state |
| `get_page_text` | Bulk text extraction when you want prose, not structure |
| `find` | Locate an element without reading the whole page |
| `computer` (`screenshot`) | Pixel view — for layout, spacing, and visual comparison |

### Acting on the page
| Tool | Purpose |
|---|---|
| `computer` | Click, type, key presses, scroll, screenshot — the general driver |
| `form_input` | Fill form fields directly; more reliable than click-then-type |
| `file_upload` / `upload_image` | Attach files to a file input |
| `javascript_tool` | Run JavaScript in the page when no tool fits |
| `shortcuts_list` / `shortcuts_execute` | Discover and run registered shortcuts |
| `browser_batch` | Several browser actions in one call |

### Debugging
| Tool | Purpose |
|---|---|
| `read_console_messages` | Console output. Pass `pattern` (regex) to filter — output is verbose. |
| `read_network_requests` | Network traffic — the fastest way to learn a SPA's real API shape |
| `gif_creator` | Record a multi-step interaction for the user to review |

### Multiple browsers
| Tool | Purpose |
|---|---|
| `list_connected_browsers` | Which browsers are connected |
| `select_browser` / `switch_browser` | Choose which one to drive |

## Capturing evidence

`computer` with `action: "screenshot"` returns the image. To keep it as a build or
QA artifact, save it under `screenshots/inspect/<page-name>.jpg` (Phase 1) or
`screenshots/qa/<feature>.jpg` (Phase 3) so later phases can compare the clone
against the original.

For a multi-step flow the user may want to review, `gif_creator` records it —
capture a few extra frames before and after the actions so playback is smooth,
and give the file a meaningful name (`login_process.gif`, not `out.gif`).

## Reading the network to learn the API

For Phase 1 this is the highest-value tool in the set. A SPA's REST surface is
usually invisible in the DOM but obvious in its XHR traffic:

1. `read_page` to orient
2. Perform the action you want to understand (create a record, run a search)
3. `read_network_requests` — read the request method, path, payload shape and
   response shape
4. Record that endpoint in `spec-build.md` so the Build loop can mirror it

The clone builds its **own** API modelled on that shape. It never calls the
target's API.

## Dialogs — do not trigger them

JavaScript `alert`, `confirm`, and `prompt`, and browser modal dialogs, **block all
further browser events**. Once one is open the extension receives no more commands
and the loop is stuck until a human dismisses it.

- Avoid clicking things likely to raise one (a "Delete" button with a confirm).
- If you must, warn the user first that it may interrupt the session.
- Use `console.log` plus `read_console_messages` for debugging instead of `alert`.
- If one appears anyway, tell the user they need to dismiss it manually.

## Avoid rabbit holes

Stay on the one page or feature this iteration is scoped to. Stop and ask the user
rather than grinding if you hit any of these:

- A tool call fails or errors 2–3 times in a row
- The extension stops responding
- Elements do not respond to clicks, or pages will not load
- You cannot complete the task after a couple of different approaches

Say what you attempted, what went wrong, and ask how to proceed. Do not retry the
same failing action indefinitely or wander into unrelated pages.
