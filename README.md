# Ralph-to-Ralph

**Autonomous Product Cloning Loop**

Give it any URL → It inspects, builds, tests, and deploys a working clone.

![Ralph-to-Ralph Architecture](decks/ralph-to-ralph/assets/architecture-diagram.png)

## What Is This?

Ralph-to-Ralph clones real products end-to-end — from browser analysis to deployed production software. Real, working products that you now own.

**The problem:** Non-technical founders know exactly what product they want to build or clone, but can't build and launch it at production quality themselves. Getting to production typically takes months or years, requires entire engineering teams, and costs significant money.

**The solution:** Ralph-to-Ralph automates the entire process. Point it at any SaaS product URL and it autonomously inspects, plans, builds, tests, and deploys a fully working clone.

## How It Works

Ralph-to-Ralph runs a three-phase autonomous pipeline:

### Phase 1: Inspect (Ralph Loop #1)

**Ever CLI + Claude Opus** analyzes the target URL and produces:
- `PRD.json` — structured product requirements
- `spec-build.md` — technical build specification
- Sitemap + screenshots of every page

### Phase 2: Build (Ralph Loop #2)

**Claude Agent (Opus)** builds the full stack:
- API routes + React components
- Unit tests (Vitest)
- AWS infrastructure (SES, RDS, S3)

### Phase 3: QA (Ralph Loop #3)

**Claude QA Agents** verify everything works:
- E2E testing via Ever CLI
- Bug fixes + visual regression screenshots
- Regression test suite

A **bug fix loop** (Bug Found → Fix → Retest, up to 5 cycles) runs between Build and QA until the product passes all checks.

## Watchdog Orchestrator

A strict watchdog wraps the entire pipeline, ensuring all Ralph loops stay stable and keep shipping:

- **Auto-restart on failure** — if any loop crashes, it restarts automatically
- **Git commit + push** — every milestone is committed and pushed
- **Cron backup** — periodic backups for safety

## AI Agents & Tools

| Agent | Role |
|-------|------|
| **[Ever CLI](https://foreverbrowsing.com)** | Custom browser agent for site inspection and E2E testing |
| **Claude Opus** | Powers the Inspect and Build loops — architecture, code generation, infra setup |
| **Claude (QA)** | Runs independent fresh-context QA agents for thorough verification |

## Running It

```bash
# 1. Provision the AWS infrastructure once (RDS, SES, S3, ECR)
APP_NAME=my-clone ./scripts/preflight.sh

# 2. Point the pipeline at a target product
./scripts/start.sh https://example.com
```

The watchdog takes it from there — inspect, build, QA — committing after
every feature. Progress is visible in `prd.json` (`passes` flags),
`progress-*.txt`, and `report-qa.json`.

### What a Completed Run Produces

- **A real backend** — the clone serves its own REST API; it never proxies the target's
- **Real cloud infrastructure** — AWS SES, RDS Postgres via Drizzle, S3, deployed on App Runner
- **A dashboard** — pages matching the target product's UI, built from inspection screenshots
- **A TypeScript SDK** in `packages/sdk/` when the target ships a client library
- **API docs** — an auto-generated `/docs` page covering every endpoint
- **A test suite** — Vitest unit tests plus Playwright E2E specs, one of each per feature
- **An auth wall** — API keys unlock both the dashboard and the API

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **UI:** Radix UI
- **Database:** RDS Postgres via Drizzle ORM
- **Email:** AWS SES
- **Storage:** AWS S3
- **Deployment:** AWS App Runner

## Team

- **Jaeyun Ha** — [github.com/jaeyunha](https://github.com/jaeyunha)
- **Ashley Ha** — [github.com/ashley-ha](https://github.com/ashley-ha)

## Ralphthon Seoul 2026

This project was built for [Ralphthon Seoul 2026](https://ralphthon.com) — a hackathon focused on building real products with AI agents.
