# Pipefy Clone — Build Spec

> **STATUS: PARTIAL — docs-derived only.** No UI has been inspected yet (iteration 1
> was documentation extraction). Site map, screenshots, design system, and
> UI-observed behavior are all still TODO. Do not treat any section below as final
> until the "UI Inspection Coverage" checklist at the bottom is all checked.

## 1. Product Overview

Pipefy is a no-code business-process/workflow platform. The core mental model:

- An **Organization** is the tenant. It contains **Pipes** and **Database Tables**.
- A **Pipe** is a Kanban-style board representing one business process (e.g.
  "Purchase Requests", "Customer Onboarding"). A pipe has an ordered list of
  **Phases** (the board's columns).
- A **Card** is one unit of work (e.g. one purchase request). A card lives in
  exactly one phase at a time and moves left-to-right through phases as work
  progresses. Cards are created via a **Start Form** (the pipe's intake form).
- Each **Phase** defines a set of **Fields** that appear on cards in that phase.
  Fields have ~23 distinct types (see Data Models below) — this rich field-type
  system is a core differentiator vs. a plain Kanban tool.
- A **Database Table** is a separate structured-data object (spreadsheet-like),
  with its own fields and **Table Records**, usable standalone or connected to
  pipes via `connector`-type fields (so a card can reference/create table records
  or cards in other pipes).
- **Reports** are saved aggregation/summary views over a pipe's cards (counts,
  sums, grouped breakdowns) — maps to Postgres aggregation queries in our clone.
- **Tags** are an org-wide labeling system, applied to any resource, grouped by
  category.
- **Tasks** are assignable sub-items on a card (distinct from the card itself).
- **AI Agents** and **Automations** attach to phases/pipes and react to card
  events (created, moved, updated) — modeled as data + simple rule execution in
  the clone, not real LLM orchestration (BYOLLM/multi-provider config is out of
  scope per project rules).
- **Webhooks** notify external URLs of pipe/table/org events.

**Who it's for:** ops/business teams automating internal processes without
writing code — HR onboarding, procurement, IT tickets, customer service, legal
contract review, etc. (see `clone-product-docs/overview.md` for the full
solutions-by-department list — those are marketing verticals, not features to
build separately; they're all the same underlying Pipe/Card/Field engine).

## 2. Tech Stack Recommendation

Per `CLAUDE.md` — Next.js 16 (App Router) + TypeScript strict + Tailwind + Radix
UI + Drizzle/Neon Postgres + Vitest + Playwright. No changes needed; this stack
fits the product well:
- Kanban board with drag-drop → client-side React, server actions/route handlers
  for card moves.
- Rich field-type system → a single `fields` table with a `type` enum column and
  a polymorphic `value` (text) column, rather than one column per type.
- File attachments → Postgres `bytea`, per project convention (no S3).
- Reports/analytics → Postgres aggregate queries (`GROUP BY`, `COUNT`, `SUM`)
  computed on read, no separate OLAP store.
- Search → Postgres full-text search (`tsvector`) over card titles/field values.
- Webhooks → a `webhooks` table of registered URLs + outbound `fetch` POST on
  card/table events.
- Auth: **out of scope** — clone uses a single API-key auth wall, no login UI,
  per project rules.

## 3. Site Map

**TODO — not yet inspected.** Next iteration must log in, `read_page` the main
dashboard, and populate this section per spec-inspect.md "Iteration 1: Site Map".
Expected top-level areas based on docs (to verify against the real UI):
- Home / pipes list (org dashboard)
- A pipe's Kanban board view (phases as columns, cards as tickets)
- Card detail view (fields, attachments, emails, tasks, activity/timeline)
- Start form (public/internal intake form for a pipe)
- Database Tables list + table detail (spreadsheet-like grid)
- Reports/dashboards view
- Pipe settings: phases, fields, automations, AI agents (partially in scope —
  the phase/field/automation *editors* are core product functionality, not
  "settings" in the excluded auth/billing/profile sense)
- Search (cross-pipe card search)

## 4. Design System

**TODO — not yet inspected.** No colors, fonts, or component patterns observed
yet — this section requires screenshots from the live UI.

## 5. Data Models

Derived from `clone-product-docs/api-reference/*.md` GraphQL shapes. Field/type
names below are the target's actual API vocabulary — the clone's own schema can
rename for clarity but should preserve the same concepts.

### Organization
- `id`, `name` — tenant root. (Users/members: out of scope to fully build —
  auth excluded — but a minimal `users` table is needed as a foreign key target
  for `assignee_select` fields, card creators, etc.)

### Pipe
- `id`, `uuid`, `name`, `color`, `users_count`, `cards_count`,
  `opened_cards_count`
- has many: `phases` (ordered), `labels` (`{id, name, color}`),
  `start_form_fields`, `members` (`{user{id,email}, role_name}`)

### Phase
- `id`, `name`, `done` (boolean — marks a terminal/"done" phase),
  `cards_count`
- has many: `fields`
- settings: SLA/done-state config (`update-phase-settings.md`) — exact fields
  TODO, re-check doc detail during build if needed

### Card
- `id`, `title`, `done` (boolean), `updated_at`
- belongs to: current `phase`
- has many: `fields` (Card Field Values: `{name, value, filled_at, field{id,label}}`)
- relations: connected cards (via `connector` fields / `throughConnectors`),
  activities/timeline, emails, tasks, attachments

### Field (phase field / start form field / table field — shared type system)
- `id` (aka `field_id`/slug — auto-generated from label, lowercase +
  underscores, immutable)
- `label`, `type`, `required`, `help`, `description`, `editable`,
  `minimal_view`, `options` (for choice types)
- **Field type enum (23 types)** — this is the richest part of the data model:
  `assignee_select`, `attachment`, `checklist_horizontal`, `checklist_vertical`,
  `cnpj`, `connector`, `cpf`, `currency`, `date`, `datetime`, `due_date`,
  `email`, `id`, `label_select`, `long_text`, `number`, `phone`,
  `radio_horizontal`, `radio_vertical`, `select`, `short_text`, `statement`,
  `time`
  - `connector` fields reference another pipe or table
    (`connectedRepoId`, `canCreateNewConnected`, `canConnectExisting`,
    `canConnectMultiples`)
  - `id` and `statement` types are display-only / not editable
  - full per-type value-format rules are in
    `clone-product-docs/api-reference/fields.md` (e.g. `date` = DD/MM/YYYY,
    `currency` = locale-dependent decimal separator, `cpf`/`cnpj` = Brazilian
    tax ID formats)

### Database Table / Table Record
- Table: `id` (alphanumeric), `name`, `public` (boolean)
- has many: `table_fields` (same type system as above)
- Table Record: `id`, `title`, `record_fields` (`{name, value, native_value,
  date_value, datetime_value, float_value, report_value, filled_at,
  updated_at, required, indexName}`)

### Report
- Saved aggregation config over a pipe's cards: columns, filterable fields,
  export. (`pipe-reports.md`, `get-pipe-report-columns.md`,
  `get-pipe-report-filterable-fields.md`)

### Tag / Tag Category
- Org-wide; `{id, name}` grouped by category; attachable to any resource by
  UUID + type.

### Task
- Assignable to a card, scoped to the card's current phase; has assignees
  (by email) and fulfillment/completion status.

### Webhook
- Registered per-org or per-pipe/table; POSTs on events (card moved, created,
  field updated, table record created, etc.) — see
  `organization-webhooks.md` / `pipe-table-webhooks.md` for the event list to
  mirror.

### AI Agent / Automation (modeled, not really executed via LLM)
- Attach to a phase or pipe; `automation-events.md` / `automation-actions.md`
  define trigger→action pairs (e.g. "on card created in phase X → set field Y").
  Clone should model this as data + a simple rule evaluator, since real
  multi-LLM-provider orchestration is out of scope.

## 6. Backend Architecture (feature → cloud service mapping)

| Feature | Backend |
|---|---|
| Pipes, Phases, Cards, Fields, Tables, Records, Tags, Tasks | Neon Postgres via Drizzle |
| Attachments | Postgres `bytea` column, served by a route handler, capped at `MAX_UPLOAD_BYTES` (5 MB) |
| Reports/dashboards | Postgres aggregation queries (`GROUP BY`/`COUNT`/`SUM`) computed on read |
| Search (cross-pipe card search) | Postgres full-text search (`tsvector`) |
| Webhooks | `webhooks` table + outbound `fetch` POST on relevant DB writes |
| Automations/AI Agents | `automations` table (trigger/action rows) evaluated synchronously on card write; no real LLM call |
| Bulk import (xlsx) | Parse client-side or in a route handler, batch-insert cards/records |
| Hosting | Render web service, native Node runtime, built from the repo |

The clone builds its own REST API modeled on these GraphQL resource shapes —
it never calls Pipefy's real API.

## 7. SDK / Developer Experience

Pipefy's actual DX is GraphQL-only (no npm/pip client library in the extracted
docs — `developers.pipefy.com` is pure GraphQL API reference, not an SDK).
Per `spec-inspect.md` SDK scope rule (TypeScript/Node only), the clone should:
- Ship a thin **TypeScript SDK** (`packages/sdk/`) wrapping our own REST API
  with typed methods mirroring the GraphQL resource names, e.g.
  `client.pipes.get(id)`, `client.cards.create({...})`,
  `client.cards.moveToPhase(cardId, phaseId)`, `client.tables.records.list(tableId)`.
- Document webhook event payloads (mirroring `organization-webhooks.md` /
  `pipe-table-webhooks.md`) so a developer can consume events the same way.
- No CLI observed in the target's docs — skip.

## 8. Deployment

Render web service, native Node runtime (no Docker), build `npm install && npm
run build`, start `npm start`, binds `$PORT`. Neon Postgres via
`NEON_DATABASE_URL`. See `scripts/render.sh` in this repo for deploy tooling —
already built, not part of the PRD.

## 9. Build Order

Not yet finalized — PRD only has doc-derived scaffolding/API-shape entries so
far (see `prd.json`). Full prioritized build order (with `priority`/`core`
fields on every `prd.json` entry) is written on the **final** inspect iteration,
per spec-inspect.md, once the core features are confirmed by UI inspection.
Provisional core-feature guess (to validate against the real UI next):
1. Project scaffolding + design system foundations
2. Pipe list + Kanban board (phases as columns) + card detail — **core**
3. Field type system (form rendering + card field values) — **core**
4. Start form (card creation) — **core**
5. Database Tables (grid view + records) — **core**
6. Reports/dashboards — secondary
7. Tags, tasks, search, webhooks — secondary
8. Automations/AI Agents (data model + simple rule execution) — secondary
9. Bulk import, polish, edge cases — last

## UI Inspection Coverage Checklist
- [ ] Site map (Iteration 1)
- [ ] Home / pipes list
- [ ] Kanban board view
- [ ] Card detail view
- [ ] Start form
- [ ] Database Tables (list + detail)
- [ ] Reports/dashboards
- [ ] Phase/field/automation editors
- [ ] Search
- [ ] Design system consolidated from screenshots
- [ ] Final cleanup pass + PRD reorder (spec-inspect.md "Final Iteration")
