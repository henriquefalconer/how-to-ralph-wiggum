# Ralph-to-Ralph: Autonomous Product Cloner

## What This Is
A three-phase autonomous system that clones any SaaS product from just a URL.
Phase 1: Inspect (Claude in Chrome) → Phase 2: Build (Claude + Playwright E2E) → Phase 3: QA (Claude in Chrome)

## Tech Stack
- **Framework**: Next.js 16 (App Router, Turbopack) — pre-installed, do not change
- **Language**: TypeScript strict mode, no `any` types
- **Styling**: Tailwind CSS
- **UI Primitives**: Radix UI (or whatever matches the target product)
- **Database**: Neon serverless Postgres via Drizzle ORM (`pg`)
- **Storage**: uploads stored in Postgres (`bytea`), served by route handlers
- **Deployment**: Render web service, built from the GitHub repo with Render's native Node runtime (no Docker)
- **Unit Tests**: Vitest
- **E2E Tests**: Playwright (pre-configured)
- **Linting**: Biome (pre-configured)

## Commands
- `make check` — typecheck + lint/format (Biome)
- `make test` — run unit tests (Vitest)
- `make test-e2e` — run E2E tests (Playwright, requires dev server)
- `make all` — check + test + test-e2e
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run db:generate` — generate Drizzle migrations
- `npm run db:migrate` — run Drizzle migrations

## Quality Standards
- TypeScript strict mode, no `any` types
- Every feature must have at least one unit test AND one Playwright E2E test
- Run `make check && make test` before every commit
- Small, focused commits — one feature per commit

## Architecture
- `src/` — source code
- `src/app/` — Next.js App Router pages and API routes
- `src/components/` — React components
- `src/lib/` — utilities, helpers, API clients (db.ts)
- `src/types/` — TypeScript types
- `tests/` — unit tests (Vitest)
- `tests/e2e/` — E2E tests (Playwright)
- `packages/sdk/` — TypeScript SDK npm package
- `scripts/` — infrastructure and deployment scripts

## Pre-configured (DO NOT reinstall or recreate)
- **Playwright** — `playwright.config.ts`, `tests/e2e/`, `npm run test:e2e`
- **Biome** — `biome.json`, fast lint + format
- **Makefile** — `make check`, `make test`, `make test-e2e`, `make all`
- **Drizzle** — `drizzle.config.ts`, `npm run db:generate`, `npm run db:migrate`

## Environment
- **Missing tools** — if a command the workflow calls for isn't on `PATH` (`make`, and anything else), install it with whatever package manager this machine has rather than working around it or silently skipping the step.
- **GitHub CLI** — installed as a Windows binary, **not** on `PATH` as `gh`. Invoke it by full path:
  ```bash
  "/mnt/c/Program Files/GitHub CLI/gh.exe" auth status
  ```
  Plain `git push` over HTTPS has no credentials of its own and fails with
  `could not read Username for 'https://github.com'`. `gh.exe` is already
  authenticated, so it supplies them via the credential helper configured in
  this repo:
  ```bash
  git config --local credential."https://github.com".helper \
    '!"/mnt/c/Program Files/GitHub CLI/gh.exe" auth git-credential'
  ```
  With that set, `git push` works normally — the loops commit and push on their own.
  Use `gh.exe` for any other GitHub work too (PRs, issues, API).
- **`.env`** contains:
  - `NEON_DATABASE_URL` — Neon Postgres connection string
  - `DASHBOARD_KEY` — master key for dashboard access
  - `RENDER_API_KEY` — Render API key (Account Settings -> API Keys)
  - `RENDER_SERVICE_ID` — Render service id (`srv-...`, from the service's dashboard URL)

  These four are the whole list. Do not add credentials for the target product —
  the clone authenticates against its own API with its own keys, never the target's.
- **Preflight** — `./scripts/preflight.sh` validates `.env` before a run and lists anything missing.

## Deployment — `scripts/render.sh`
Render builds from the connected GitHub repo (build `npm install && npm run build`,
start `npm start`, app binds Render's injected `$PORT`). `scripts/render.sh` wraps the
Render REST API and reads its credentials from `.env`.

- `deploy` — deploy only if necessary.
  ```bash
  ./scripts/render.sh deploy
  ```
- `logs` — build and deploy logs for the latest deploy, or for a given deploy id.
  ```bash
  ./scripts/render.sh logs            # latest deploy
  ./scripts/render.sh logs dep-xxxxx  # a specific deploy
  ```
- `settings` — project settings: name, type, repo, branch, region, plan, auto-deploy, URL, env vars.
  ```bash
  ./scripts/render.sh settings
  ```
- `status` — latest deploy id, status, commit and timestamp.
  ```bash
  ./scripts/render.sh status
  ```

The `RENDER_API_KEY` and `RENDER_SERVICE_ID` in `.env` can be used to edit any configuration in Render as needed.

## Git Branch
Never change branches — always commit and push to whichever branch is already checked out.
## Browser & Target Account

### Account identity
- **Never write the Proton Mail address into any file, prompt, commit message, test, or log — read it from the logged-in session at the moment you need it.**
- Use whichever account is **already logged in to `proton.me` in Chrome** as the account email anywhere the target product asks for one — signup, login, "add contact", domain/sender verification, invite flows, newsletter opt-ins, test recipients. Open `https://mail.proton.me` and read the address off the session rather than assuming one.
- Do not invent other email addresses for the target product. If a flow needs a second address, use a plus-alias of that same mailbox (`<local-part>+<label>@proton.me`).
- Mail for that address is read in Proton Mail (`proton.me`) in the browser — that is where confirmation links and verification codes land.

### Chrome session (already authenticated)
- Chrome is already running with a **logged-in `proton.me` session**. Reuse it — do **not** log out, clear cookies, use an incognito/guest window, or start a fresh profile, or you will lose the session.
- To read a verification email, open a tab on `https://mail.proton.me` in that same window; the inbox loads without re-authenticating.

### Finding and launching Chrome
Chrome may already be running. If it is not, locate the binary on disk and launch it rather than assuming a fixed path:

```bash
# Is it already running?
tasklist.exe | grep -i chrome

# Known locations on this machine (prefer the 64-bit one):
"/mnt/c/Program Files/Google/Chrome/Application/chrome.exe"
"/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"

# If neither exists, search for it:
ls /usr/bin/*chrom* /opt/google/chrome/chrome 2>/dev/null
find "/mnt/c/Program Files" "/mnt/c/Program Files (x86)" "/mnt/c/Users/$USER/AppData/Local" \
  -maxdepth 5 -name 'chrome.exe' 2>/dev/null

# Launch with the default profile (keeps the proton.me session):
"/mnt/c/Program Files/Google/Chrome/Application/chrome.exe" &
```

There is no Linux Chrome inside WSL — the browser is the Windows host Chrome.

### Use claude-in-chrome
- Drive that Chrome via **claude-in-chrome** — the loop scripts already pass `--chrome` to `claude -p`. Keep that flag.
- Work in the existing authenticated window so the `proton.me` session is available to every phase (inspect, build, QA).
- claude-in-chrome is the only browser driver in this project — for inspecting the target, for QA against the clone, and for anything needing the logged-in session. See `claude-in-chrome-reference.md` for the tool reference.
- **Always close the tab when the task is done.** Whenever you used claude-in-chrome, close the tabs you opened (`tabs_close_mcp`) before ending your turn. A run is hundreds of iterations long and each one opens tabs; left behind, they pile up in the user's window until Chrome is unusable. Close the tab, not the window — the window holds the `proton.me` session every later phase depends on.

## Out of Scope — DO NOT build
- **Docker — do NOT use it in this project.**
- Login / signup / authentication (use API key auth wall instead)
- Paywalls, billing, subscription management
- Account settings, profile management
- OAuth / SSO integrations
- Payment processing
