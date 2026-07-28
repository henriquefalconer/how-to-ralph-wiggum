# Pre-configured Setup — DO NOT recreate or reinstall

Everything listed here is already installed and configured. Do NOT reinstall, reconfigure, or overwrite these.

## Tooling
- **Next.js 16** — `next.config.js` (standalone output for Docker, Turbopack)
- **TypeScript** — `tsconfig.json` (strict mode, `@/` path aliases)
- **Tailwind CSS** — `tailwind.config.ts` + `postcss.config.js` (dark mode, src paths)
- **Biome** — `biome.json` (lint + format, replaces ESLint/Prettier)
- **Vitest** — `vitest.config.ts` (jsdom, path aliases, `tests/*.test.ts`)
- **Playwright** — `playwright.config.ts` + Chromium installed (`tests/e2e/*.spec.ts`)
- **Drizzle ORM** — `drizzle.config.ts` + `src/lib/db/index.ts` + `src/lib/db/schema.ts`
- **Docker** — `Dockerfile` (multi-stage, standalone) + `.dockerignore`

## Commands (use these, don't create new ones)
- `make check` — typecheck + Biome lint/format
- `make test` — unit tests (Vitest)
- `make test-e2e` — E2E tests (Playwright, needs dev server)
- `make all` — check + test
- `make fix` — auto-fix lint/format issues
- `make db-push` — push Drizzle schema to Postgres
- `npm run dev` — dev server on port **3015**
- `npm run build` — production build

## Infrastructure (validated by `scripts/preflight.sh`)
Every service below is on a free tier and is created from its own web dashboard.
`scripts/preflight.sh` checks that `.env` has the credentials for all of them:
- **Neon Postgres** — serverless Postgres, connection string in `.env` as `DATABASE_URL`.
  Holds both the relational data and any uploaded files.
- **Render** — Docker web service built from the repo `Dockerfile`, free plan
- **GitHub Container Registry** — images at `ghcr.io/<owner>/<repo>`

## File Storage
Uploads live in Postgres, in a `bytea` column alongside their metadata — there is no
separate object store:
```ts
export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  data: customType<{ data: Buffer }>({ dataType: () => "bytea" })("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```
Serve bytes back through a route handler (`/api/files/[id]`) that sets `Content-Type`
and `Content-Length` from the row.

**Cap every upload.** The database is the storage budget, so reject anything over
`MAX_UPLOAD_BYTES` (default 5 MB) in the route handler *before* reading the body, and
keep total stored bytes well under the plan's limit. Writes fail rather than silently
costing money, so a missing cap surfaces as a broken feature, not a bill.

## Container Registry
The GitHub CLI is a Windows binary, not on `PATH` as `gh`. Use it to log in to `ghcr.io`:
```bash
GH="/mnt/c/Program Files/GitHub CLI/gh.exe"
"$GH" auth token | docker login ghcr.io -u "$("$GH" api user --jq .login)" --password-stdin
```

## Project Structure (already scaffolded)
```
src/app/           — Next.js App Router (layout.tsx, page.tsx, globals.css)
src/app/api/       — API routes (you create these)
src/components/    — React components (you create these)
src/lib/           — Utilities and clients
src/lib/db/        — Drizzle ORM (index.ts + schema.ts ready)
src/types/         — TypeScript types (you create these)
tests/             — Unit tests (Vitest)
tests/e2e/         — E2E tests (Playwright)
packages/sdk/      — SDK package (you create this)
screenshots/inspect/ — Original product screenshots
screenshots/build/   — Build verification screenshots
screenshots/qa/      — QA evidence screenshots
scripts/           — Infrastructure and deploy scripts
```

## .env Contents
- `DATABASE_URL` — Neon Postgres connection string
- `DASHBOARD_KEY` — master key for dashboard auth (set when needed)

## Target Product Login (if session expires)
The browser already holds a logged-in session for the target product — see
"Browser & Target Account" in `CLAUDE.md` for the account email and how to reach
the mailbox for confirmation links. If the target logs you out during inspection,
sign back in with that account: `ever click` the sign-in fields, `ever input` the
credentials, submit.

## Port
Dev server runs on **3015**. Do not change this.
