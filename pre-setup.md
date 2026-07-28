# Pre-configured Setup — DO NOT recreate or reinstall

Everything listed here is already installed and configured. Do NOT reinstall, reconfigure, or overwrite these.

## Tooling
- **Next.js 16** — `next.config.js` (Turbopack)
- **TypeScript** — `tsconfig.json` (strict mode, `@/` path aliases)
- **Tailwind CSS** — `tailwind.config.ts` + `postcss.config.js` (dark mode, src paths)
- **Biome** — `biome.json` (lint + format, replaces ESLint/Prettier)
- **Vitest** — `vitest.config.ts` (jsdom, path aliases, `tests/*.test.ts`)
- **Playwright** — `playwright.config.ts` + Chromium installed (`tests/e2e/*.spec.ts`)
- **Drizzle ORM** — `drizzle.config.ts` + `src/lib/db/index.ts` + `src/lib/db/schema.ts`
- **Render CLI helper** — `scripts/render.sh` (deploy, logs, settings, status)

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
- **Neon Postgres** — serverless Postgres, connection string in `.env` as `NEON_DATABASE_URL`.
  Holds both the relational data and any uploaded files.
- **Render** — web service on the free plan, built from the connected GitHub repo with
  Render's native Node runtime (build `npm install && npm run build`, start `npm start`).
  No Docker, no image registry. Credentials in `.env` as `RENDER_API_KEY` and
  `RENDER_SERVICE_ID`; drive it with `scripts/render.sh`.

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

## Deployment
Render builds from the connected GitHub repo — pushing to the service's branch is all
that ships code. `scripts/render.sh` wraps the Render API:
```bash
./scripts/render.sh status     # latest deploy id, status, commit
./scripts/render.sh deploy     # deploy only if Render is behind local HEAD
./scripts/render.sh logs       # build + deploy logs for the latest deploy
./scripts/render.sh settings   # service config and env vars
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
- `NEON_DATABASE_URL` — Neon Postgres connection string
- `DASHBOARD_KEY` — master key for dashboard auth (set when needed)
- `RENDER_API_KEY` — Render API key (Account Settings -> API Keys)
- `RENDER_SERVICE_ID` — Render service id (`srv-...`, from the service's dashboard URL)

## Target Product Login (if session expires)
The browser already holds a logged-in session for the target product — see
"Browser & Target Account" in `CLAUDE.md` for the account email and how to reach
the mailbox for confirmation links. If the target logs you out during inspection,
sign back in with that account: `ever click` the sign-in fields, `ever input` the
credentials, submit.

## Port
Dev server runs on **3015**. Do not change this.
