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
- **Neon Postgres** — serverless Postgres, connection string in `.env` as `DATABASE_URL`
- **Cloudflare R2** — S3-compatible object storage, bucket in `.env` as `R2_BUCKET`
- **Render** — Docker web service built from the repo `Dockerfile`, free plan
- **GitHub Container Registry** — images at `ghcr.io/<owner>/<repo>`

## Cloudflare R2 Client
R2 speaks the S3 API, so use `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`:
```ts
new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
```

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
- `R2_ACCOUNT_ID` — Cloudflare account ID (used to build the R2 endpoint)
- `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` — R2 API token credentials
- `R2_BUCKET` — R2 bucket name
- `DASHBOARD_KEY` — master key for dashboard auth (set when needed)

## Target Product Login (if session expires)
The browser already holds a logged-in session for the target product — see
"Browser & Target Account" in `CLAUDE.md` for the account email and how to reach
the mailbox for confirmation links. If the target logs you out during inspection,
sign back in with that account: `ever click` the sign-in fields, `ever input` the
credentials, submit.

## Port
Dev server runs on **3015**. Do not change this.
