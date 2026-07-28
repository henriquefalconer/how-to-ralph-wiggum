# Ralph-to-Ralph: Autonomous Product Cloner

## What This Is
A three-phase autonomous system that clones any SaaS product from just a URL.
Phase 1: Inspect (Claude + Ever CLI) → Phase 2: Build (Claude + Playwright E2E) → Phase 3: QA (Claude + Ever CLI)

## Tech Stack
- **Framework**: Next.js 16 (App Router, Turbopack) — pre-installed, do not change
- **Language**: TypeScript strict mode, no `any` types
- **Styling**: Tailwind CSS
- **UI Primitives**: Radix UI (or whatever matches the target product)
- **Database**: Neon serverless Postgres via Drizzle ORM (`pg`)
- **Storage**: uploads stored in Postgres (`bytea`), served by route handlers
- **Deployment**: Render (Docker web service)
- **Registry**: GitHub Container Registry (`ghcr.io`)
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
  - `DATABASE_URL` — Neon Postgres connection string
  - `DASHBOARD_KEY` — master key for dashboard access
  - Target product API keys (for testing/comparing only, not for the clone's backend)
- **Preflight** — `./scripts/preflight.sh` validates `.env` before a run and lists anything missing.

## Out of Scope — DO NOT build
- Login / signup / authentication (use API key auth wall instead)
- Paywalls, billing, subscription management
- Account settings, profile management
- OAuth / SSO integrations
- Payment processing
