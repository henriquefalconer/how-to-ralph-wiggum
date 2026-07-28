# Pipefy Clone — Build Spec

> **STATUS: COMPLETE.** All pages/features listed in `sitemap.md` have been
> live-tested across 12 inspect iterations (docs extraction, site map, then
> feature-by-feature deep dives). The one open item — Tarefas e Solicitações's
> underlying data source — is accepted as an unresolved low-priority edge case
> (see the coverage checklist below), not a blocker. This spec is the primary
> input for the Build phase.

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

**COMPLETE.** Full detail in `sitemap.md` (mirrored here at a summary level;
every row there is now either fully inspected or explicitly marked
out-of-scope). The trial org
started with **zero pipes**, which forces a non-dismissable "create your first
pipe" modal — not real product behavior, do not clone that; a test pipe
("Purchase Requests") was created to proceed.

**Org-level nav:** Início (dashboard: Pipes/Databases grid), Portal (a sample
Interfaces page acting as an employee self-service portal), Tarefas e
Solicitações (cross-pipe task inbox), Interfaces (no-code page/portal builder —
new feature, not yet in prd.json), Learning Center (help/marketing — **out of
scope**).

**Pipe-level nav:** top tabs Pipe / Agentes de IA / Automações / Integrações
(paid connector marketplace — **out of scope**) / Conexões (attach Database
Tables for `connector` fields) / Gerenciar (settings dropdown: Formulário
inicial, **Fases** [phase/field editor — highest priority for next deep dive],
Pessoas, Email, Configurações do pipe, Atividades, Ferramentas, Lixeira).
Page tabs: Mapa (visual map), Fluxo (visual pipeline/phase builder), **Kanban**
(core board view), Lista (configurable table view), Relatórios (report
builder), Formulário (start form editor), Emails (shared inbox per pipe),
Painéis (dashboards/charts).

All of the above, plus Interfaces/Portal builder, Meu trabalho, notifications,
card search, and the start-form editor, were inspected across iterations 2-11
— see the UI Inspection Coverage Checklist below for the full cross-reference.

## 4. Design System

Consolidated from `screenshots/inspect/*.jpg` across all 12 iterations
(home, kanban-board, phases-editor, dashboard-panel, and every other captured
screen). Pipefy's UI is a light, low-chroma neutral surface with a small set
of saturated accent colors reserved for state and brand moments — the clone
should reproduce this restraint rather than inventing extra color.

**Color palette (approximate hex, sampled from screenshots):**
- **Primary blue** `#2E68D9`-ish — primary buttons ("Adicionar gráfico",
  "Criar novo card"), links ("Ver detalhes de uso"), focus rings, the active
  tab underline, outlined "Upgrade" button border/text.
- **Teal/turquoise accent** `#1AB6A6`-ish — the default pipe icon color seen
  in this org, the active/current-phase column header text + left border +
  background tint (`Caixa de entrada` column), field-type icon backgrounds in
  the Fases palette.
- **Near-black navy** `#1F2430`-ish — the active org-nav pill ("Início"),
  primary body text, card titles.
- **AI/purple-pink gradient** — reserved exclusively for AI-flagged
  surfaces: the "Deixe a IA criar seu próximo pipe" input's gradient border
  (blue→pink), the floating AI assistant button (blue→purple gradient
  circle), sparkle icons next to AI-assisted field types (Texto curto,
  Anexo) in the Fases palette. This is a deliberate visual language for
  "AI touches this" that the clone should preserve as a distinct token
  (`--ai-gradient`), not reuse for ordinary primary actions.
- **Neutral grays** — page background `#F5F6F8`-ish, card/column background
  a slightly lighter/white `#FAFAFB`-ish inside a `#F5F6F8` board canvas,
  borders `#E4E7EB`-ish, muted/placeholder text `#8A93A6`-ish.
- **Semantic**: success/toast green (`Gráfico criado. Confira!` toast),
  destructive red (delete actions, "Vencidos" overdue badges), warning
  amber (plan-usage banner background is a pale blue, not amber — Pipefy
  uses pale-blue for informational banners rather than a separate info
  color).

**Typography:** a clean grotesque sans-serif throughout (renders like Inter
or a similar system sans — no serif or monospace observed anywhere in the
product UI, monospace only appears in code/token contexts). Loose type scale
observed: page/section headers ~20-24px semibold, card/column titles
~14-16px semibold, body/label text ~13-14px regular, helper/meta text
~12px muted gray.

**Layout pattern:** top nav bar (org-level or pipe-level, swaps per
context) + a horizontal tab strip immediately below for the current
object's sub-pages — no left sidebar in this org. Content area is full-width
below the tabs. Kanban-style column layouts (phase columns, the field-type
palette, the AI-agent behavior list) share one visual idiom: a scrollable
horizontal or vertical stack of rounded-corner (~8px) white/light cards on
a light-gray canvas, each card `12-16px` internal padding, `~12px` gaps
between cards.

**Shared component patterns (confirmed reused across ≥2 features, build
each once):**
- **Grouped field/token picker** — a searchable dropdown grouping items
  under "Geral > Atributos do Card" then "Fases > <phase> > <fields>".
  Reused by Field Conditionals, Automations, Reports, Email templates, AI
  Agents, PDF Generator, and Interfaces' Texto element — 7 confirmed
  reuses (see §13/§17/§18/§20/§21). Build as one parameterized component.
- **Name-only creation modal** — Pipe, Database, Report, Dashboard, and
  Interface creation all start from the same shallow "just give it a name"
  modal pattern before routing into the full editor.
- **Autosave with a status pill** — Interfaces builder and the start-form
  field editor both autosave with a cycling status indicator (`Sem
  alterações` → `Última alteração em <timestamp>` → saved checkmark) rather
  than an explicit Save button; contrast with Modo Público and Opções
  Avançadas modals, which DO require an explicit Salvar click. The clone
  should implement both save modes, matching per-surface as documented in
  each feature's section above.
- **Kebab (⋮) menu for row/tile-level actions** — Automations list,
  Database records, PDF templates, Reports/Dashboards all use the same
  `⋮` → dropdown (Editar/Duplicar/Excluir or similar) pattern.
- **Toast notifications** — bottom-left or top-right transient
  confirmations (`"Card criado com sucesso..."`, `"Gráfico criado.
  Confira!"`, `"Configurações atualizadas."`) after most non-destructive
  mutations; several autosave flows (phase field edits) skip the toast
  entirely — do not assume every mutation toasts.

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
- has many: `phases` (ordered), `labels` (`{id, name, color}`, **UI-confirmed
  Iteration 2** via Ferramentas > Etiquetas — see §15 below), `start_form_fields`,
  `members` (`{user{id,email}, role_name}`, **UI-confirmed Iteration 2** via
  Gerenciar > Pessoas — see §15 below)
- **Creation flow — UI-confirmed Iteration 3** (see §16 below): creating a pipe
  takes a single required input, `name`. `color` is a server-assigned side
  effect (not user-chosen at creation, not derived from `name` — confirmed by
  creating two pipes back-to-back and observing different colors), editable
  afterward via Configurações do pipe. Every new pipe auto-provisions the SAME
  3-phase starter template (`Caixa de entrada` → `Fazendo` → `Concluído`,
  only the last has `done=true`), each starting at `cards_count=0`.
- settings (confirmed Iteration 2, Gerenciar > Configurações do pipe — see §15):
  `icon`, `tags` (max 3), `item_name` (default "Cards"),
  `create_card_button_label`, `default_view`, **`title_field_id`** (fk,
  nullable — drives `card.title`, see the Card section's corrected note below),
  `kanban_preview_field_ids`, `connected_card_field_ids`,
  `expiration_alert_time`/`expiration_alert_unit`/`expiration_alert_business_days_only`
  (pipe-wide overdue alert, distinct from the per-phase SLA in §Phase),
  `visibility`, `ai_agents_enabled`, `ai_copilot_enabled`,
  `allow_bulk_actions`, `restrict_edit_to_assignee`, `restrict_delete_to_admin`

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
- **CORRECTED (Iteration 2, live UI test — supersedes the Iteration 3 note
  below):** `title` is **not** hardcoded to the first start-form field. It is
  driven live by `pipe.title_field_id` (configured via Gerenciar >
  Configurações do pipe's "Título do card" picker — defaults to the first
  start-form field but is independently changeable at any time), the exact
  same pattern as the Database Table's `title_field_id` (§ below). Confirmed
  via the pipe's own audit log (Gerenciar > Atividades > Alterações de
  configuração), which recorded the literal change: `Atualizou a configuração
  do título do card de "—" para "Nome do solicitante"`.
- ~~(Iteration 3 note, now superseded): title set once at creation from the
  first field's value, does not re-derive~~ — it is a completely separate
  value from any same-labeled field owned by a phase (see field scoping note
  below — this part still holds). Card detail route: `/open-cards/:cardId`.

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
- Table: `id` (alphanumeric), `name`, `public` (boolean, confirmed in UI as
  "Database público"/"Database privado"), `title_field_id` (fk, nullable —
  **confirmed in UI**: "Título do registro" is an explicit dropdown, record
  titles are NOT hardcoded to "first field," unlike Cards), `subtitle_template`
  (confirmed UI: "Subtítulo do registro conectado", defaults to "Criado em"),
  `create_button_label` (confirmed UI: "Texto do botão de criar registros",
  defaults to "Criar registro"), `all_members_can_crud` (bool, confirmed UI:
  "Autorizações" checkbox)
- has many: `table_fields` (same type system as above, confirmed extra types
  via live UI test: currency fields carry a nested currency-code sub-type;
  connection fields for tables are narrower than phase connectors — only
  "Conexão de database", not pipe-targeting)
- Table Record: `id`, `title` (derived from `title_field_id`'s value, live —
  re-derives if the title field's value changes, confirmed by editing a
  field and seeing the grid retitle after reload), `record_fields` (`{name,
  value, native_value, date_value, datetime_value, float_value,
  report_value, filled_at, updated_at, required, indexName}`)
- **Confirmed client staleness quirk (do not reproduce):** a newly created
  record's field values render as "Vazio" and the grid's "N registros"
  header count doesn't update until a full reload — same family as the
  Kanban card-count bug (feature-004 §11). The clone must update both
  synchronously.

### Report
- Saved aggregation config over a pipe's cards: columns, filterable fields,
  export. (`pipe-reports.md`, `get-pipe-report-columns.md`,
  `get-pipe-report-filterable-fields.md`)
- CONFIRMED live (Iteration 6): a report is a saved `{name, filters, columns}`
  tuple that re-queries the pipe's live cards on every open (not a frozen
  snapshot). Filters and the column picker draw from the identical field list
  used by the Automations token picker (feature-010) — grouped `Geral >
  Atributos do Card` then `Fases > <phase name> > <phase's own fields>`,
  confirming this grouped-field-picker is a shared component across ≥3
  features (field conditionals, automations, reports). Each filter is
  `{fieldId, operator, value}` with operator one of `is`, `is_not`,
  `contains`, `not_contains`, `is_unknown`, `exists`, combinable with AND/OR
  chips (multiple AND'd conditions on one field, plus an "ou" button to add
  an OR'd group — same AND-within-group/OR-across-groups shape as feature-009's
  conditionals). Export offers **Email** or **Download** (not exercised this
  pass — only confirmed the modal exists, to avoid an unnecessary side effect
  during inspection).

### Dashboard / Chart (new entity, Iteration 6)
- A pipe has zero or more named Dashboards (Painéis), each holding an ordered,
  freely positioned/resized grid of Chart widgets (confirmed: chart tiles have
  a drag-resize handle, same "widget on a grid" shape as feature-008's
  Interfaces page layout).
- Chart config: `{metric, dimension, timeGroupField, timeRange, timeGrouping,
  filters[], vizType, title}`. **Metric** is a computed aggregation over Cards
  — NOT a raw field value — from a fixed catalog scoped to the pipe (observed:
  Anexos do Card (Total), Cards (Total), Comentários do card (Total), Lead
  Time (horas) - Min/Somatória/Máx/Média, Responsável (Total)). **Dimension**
  groups the metric by a field (not exercised this pass). `vizType` is one of
  8 types: Área, Barra, Calendário, Linha, Número, Pizza, Dispersão, Tabela.
  Switching `vizType` auto-adjusts other config (confirmed: picking "Número"
  reset `timeGrouping` from "Dia" to "Sem agrupamento" and dropped "Por Dia"
  from the auto-generated title) — the clone should treat viz-type-appropriate
  defaults as a derived UI behavior, not stored separately per chart.
  Chart-level actions (kebab menu): Recarregar gráfico (reload), Editar
  gráfico, Duplicar gráfico, Excluir gráfico. Dashboard-level actions:
  Exportar painel em PDF, Definir permissões, Excluir painel.

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

### EmailThread / EmailMessage / EmailTemplate (confirmed, Iteration 4)
- `EmailThread`: always card-scoped (`card_id` NOT NULL) — no freeform/cardless
  compose exists in the product.
- `EmailMessage`: `direction` (inbound/outbound), `from_address` — outbound
  messages get a **per-thread generated alias**
  (`pipe{pipeId}+{token}@mail.pipefy.com`), distinct from the pipe-level
  **inbound routing alias** (`pipe{pipeId}@mail.pipefy.com`, toggleable,
  off by default). `to[]`/`cc[]`/`bcc[]` are arrays (typed addresses tokenize
  into chips). Also carries thread-level metadata independent of the card's
  own fields: `assignee_id`, `due_date`, `label_ids`, `read`.
- `EmailTemplate`: pipe-scoped, reusable; subject/body support token
  interpolation via the same "Conteúdo dinâmico" picker component already
  used by Automations (feature-010) and Reports (feature-011) — build once,
  share across all three.
- See prd feature-018 and spec-build.md §17 for full detail.

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

**FINAL.** Every `prd.json` entry carries `priority` (1 = first) and `core`
(true/false), set incrementally as features were discovered and confirmed
against the live UI. This is the definitive implementation order.

**Core features (the product's reason to exist — build first, end-to-end
with UI + API + data + tests):**
1. Pipe + Phase + Card entities, Kanban board, card detail view
   (feature-001/002/004) — the central workflow-tracking mental model.
2. Field type system — the 23 field types, phase field config, start-form
   field config (feature-002/003) — the differentiator vs. a plain Kanban
   tool.
3. Database Tables — grid, records, connection to pipes (feature-005) —
   the product's second core object type.
4. Start form / card creation (feature-029) — the intake mechanism that
   makes a pipe usable at all; confirmed card creation is fully gated on
   this (see §11).

**Build order for `prd.json` (mirrors the `priority` field):**
1. Project scaffolding, design system foundations (§4 above), core layout
   shell (top nav + tab strip, no sidebar)
2. Pipe/Phase/Card data models + Kanban board + card detail (feature-001,
   002, 004) — **core**
3. Field type system + Database Tables + SDK scaffolding (feature-003,
   005, 006) — **core**
4. Field Conditionals (feature-009)
5. Automations engine (feature-010)
6. Start form dedicated surfaces, AI Agents, Etiquetas (feature-006 dupes
   aside — feature-016, 019, 029) — **029 is core**
7. (reserved — no entries at this priority)
8. Bulk import/webhooks scaffolding (feature-007), Reports (feature-011)
9. Dashboards, Atividades audit log, Conexões, Gerador de PDF (feature-012,
   015, 021, 022)
10. Interfaces builder + all element types + AI Assistant + Emails
    (feature-008, 018, 020, 023, 024, 025, 026)
11. Pipe Settings — Pessoas, Configurações do pipe (feature-013, 014)
12. Lixeira, Meu trabalho + notifications (feature-017, 027)
15. Card search (feature-028) — smallest, most standalone, safe to build
    last among confirmed features.

**Explicitly deferred / out of scope for the clone** (per CLAUDE.md and
spec-inspect.md): login/signup/auth, billing/paywalls, account/profile
settings, OAuth/SSO, Integrações marketplace, Apps marketplace, Learning
Center, real multi-LLM AI orchestration (AI Agents/AI Assistant are data +
simple rule/stub evaluators only), Tarefas e Solicitações (data source
never confirmed after two dedicated attempts — see checklist below; a
future pass could revisit if the build loop has spare iterations, but it
does not block Build Order priorities 1-15 above).

## UI Inspection Coverage Checklist
- [x] Site map (Iteration 1) — see `sitemap.md`
- [x] Home / pipes list + pipe creation flow (Iteration 3 — template-gallery + name-only create modal, default 3-phase starter template, server-assigned color; see §16 and prd feature-001; screenshots: `screenshots/inspect/home.jpg`, `screenshots/inspect/home-pipes-grid.jpg`, `screenshots/inspect/pipe-create-modal.jpg`)
- [x] Phase/field editors (Fases — field config modal, choice-type options editor, phase Opções Avançadas [done/SLA/auto-assign], Condicionais em campos rule builder — screenshot: `screenshots/inspect/phases-editor.jpg`)
- [x] Kanban board view (card create, drag-drop move, done-phase styling — Iteration 3)
- [x] Card detail view (Iteration 3)
- [x] Start form (dedicated deep-dive, Iteration 11 — see below and §23)
- [x] Database Tables (create flow, field-type palette incl. connection fields, record create/edit, Configurações de database — screenshots: `screenshots/inspect/database-grid.jpg`, `screenshots/inspect/database-record-detail.jpg`)
- [x] Reports/dashboards (Reports builder — filter/column picker, saved report tiles; Dashboards — chart builder with 8 viz types, live aggregation metrics — Iteration 6; screenshots: `screenshots/inspect/reports-list.jpg`, `screenshots/inspect/dashboard-number-chart.jpg`, `screenshots/inspect/dashboard-panel.jpg`)
- [x] Automation rule builder (separate from field conditionals — pipe-level Automações tab; 10 triggers × 12 actions, tested end-to-end incl. Logs — screenshot: `screenshots/inspect/automations-builder.jpg`; see §13 and prd feature-010)
- [x] Interfaces / Portal builder (drag-only element palette, Dados live-query table + viewer-scoped dynamic visibility conditions, Formularios launcher-card, per-page AI Assistant chat widget — Iteration 6; remaining content/media elements [Texto/Link/Divisor/Imagem/Vídeo/Incorporar/Documento] + Compartilhar > Gerenciar pessoas — Iteration 8; see §19/§21 and prd feature-008/feature-020/feature-023 through feature-026; screenshots: `screenshots/inspect/interfaces-builder.jpg`, `screenshots/inspect/interfaces-live-view-ai-assistant.jpg`, `screenshots/inspect/interfaces-elements-builder.jpg`)
- [x] Pipe Settings — Pessoas / Configurações do pipe / Atividades / Ferramentas (Etiquetas + Gerador de PDF) / Lixeira, including full delete→restore lifecycle (Iteration 2 + Iteration 10; see §15 and prd feature-013 through feature-017; screenshots: `screenshots/inspect/pipe-settings-pessoas.jpg`, `screenshots/inspect/pipe-settings-configuracoes.jpg`, `screenshots/inspect/lixeira-populated.jpg`, `screenshots/inspect/lixeira-restored-on-kanban.jpg`)
- [x] Emails compose flow (card-scoped compose, per-thread generated alias vs. pipe inbound alias, email templates with shared 'Conteúdo dinâmico' token picker — Iteration 4; see §17 and prd feature-018; screenshots: `screenshots/inspect/emails-inbox.jpg`, `screenshots/inspect/emails-compose.jpg`)
- [x] AI Agents creation flow (3-step builder, trigger/instructions/model/skills/effort, Logs/Templates/MCP sub-tabs — Iteration 5; see §18 and prd feature-019; screenshots: `screenshots/inspect/ai-agents-empty.jpg`, `screenshots/inspect/ai-agents-behaviors-builder.jpg`, `screenshots/inspect/ai-agents-templates.jpg`)
- [x] Meu trabalho / `/my-tasks` (org-level "my work" list) + notification system (Iteration 9; see §22 and prd feature-027; screenshots: `screenshots/inspect/my-work-populated.jpg`, `screenshots/inspect/notifications.jpg`)
- [x] Search (pipe-scoped "Procurar cards" box in the Kanban top nav — Iteration 11; client-side substring filter, no network call, debounced; see §23 and prd feature-028; screenshot: `screenshots/inspect/kanban-card-search.jpg`)
- [x] Start form as its own dedicated deep-dive (Iteration 11 — internal builder is Fases-tab reuse [phase zero], plus start-form-exclusive Modo Público branding editor and Opções Avançadas; see §23 and prd feature-029; screenshot: `screenshots/inspect/start-form-editor.jpg`)
- [x] Design system consolidated from screenshots (Iteration 12 — see §4: color palette, typography, layout pattern, shared component patterns)
- [x] Final cleanup pass + PRD reorder (Iteration 12 — `prd.json` priority/core fields confirmed complete on all 29 entries; §9 Build Order finalized; PARTIAL/TODO banners removed throughout)
- [~] Tarefas e Solicitações's underlying data source — **accepted as an unresolved edge case, not a blocker.** Re-checked twice (Iterations 9 and 10): stayed empty ("Sem tarefas") even with an active overdue+assigned card populating Meu trabalho, and the card's own Atividades audit log is confirmed not the source either. A third attempt was considered for Iteration 12 but not pursued — the surface is structurally minor (a single list view, no create/edit flow observed), two independent live tests found no trigger, and forcing a third identical attempt would not change the outcome without new information (e.g. a support ticket, approval-flow feature, or admin-only object not reachable in this trial org/role). The clone should implement `/tasks-and-requests` as a simple empty-state list view (org-scoped, "Abertas"/"Concluídas" toggle, Tarefa/Pipe/Recebido em/Vencimento columns per `sitemap.md`) without a confirmed data-population rule — lowest priority in `prd.json` (feature not yet added; add as a stub if the Build loop reaches the end of the priority-15 list with iterations to spare).

## 10. Field Conditionals (new, Iteration 2)
Discovered via Gerenciar > Fases > 'Condicionais em campos'. Full detail in
`prd.json` feature-009. Summary: a single ordered list of rules per phase,
each with a condition tree (AND within a group, OR across groups via 'Novo
grupo de condições') and two action branches (true/false), evaluated
top-to-bottom with last-conflicting-rule-wins. Only the 'Ocultar' (hide)
action was observed this pass — the full action-type list is still TODO for
a follow-up iteration.

## 11. Kanban Board & Card Detail (Iteration 3, live UI test)

Tested end-to-end on the "Purchase Requests" pipe: created a start-form
field, created a card from the Kanban board, opened its detail view, edited
a phase field, moved it between phases both via drag-and-drop and via the
detail view's quick-mover, and observed done-phase styling.

**Card creation is gated on the start form having ≥1 field.** With an empty
start form, both the Kanban "Criar novo card" button and a phase column's
`+` open the *same* "Compartilhar formulário" promo modal (illustration +
"Comece a criar" CTA) instead of a create-card form — there is no way to
create a card until the start form has at least one field. Adding one field
via Gerenciar > Formulário inicial (or the "Editar" shortcut in that promo
modal) immediately turns "Criar novo card" into a real inline form (title +
the field(s) + a "Criar novo card" submit button) rendered in a popover
anchored to the button. Required-field validation is inline: an empty
required text field shows a red border + "deve ser informado" beneath it on
submit attempt, submit is blocked, no toast. On success: toast "Card criado
com sucesso. Para abri-lo, clique **aqui**" (the link opens the new card),
and the new card appears at the top of its phase's column titled with the
first field's value.

**Field scoping — same label, independent fields.** A field added to the
start form (`owner_type: start_form`) and a field with the *identical label*
added directly to a phase (`owner_type: phase`) are entirely separate Field
rows with independent values — confirmed by creating "Nome do solicitante"
in both places and observing two distinct input boxes on the card detail
view (one read-only under "Formulário Inicial" showing the start-form
submission, one editable under "Fase atual" showing the phase field,
initially blank). The clone must NOT dedupe/merge fields by label across
owner types.

**Card detail view layout** (`/open-cards/:cardId`), three columns:
- **Left**: card title (h1) · quick-action row ("Adicionar responsável",
  "Vencimento" [due date], "Adicionar etiquetas") · a tab strip (Form,
  Atividades, Anexos, Checklists, Comentários, Email, PDF, `+` to add more)
  · a "Formulário Inicial" section — read-only, shows creator name +
  relative timestamp ("há poucos segundos") + each start-form field's
  submitted value · a "Histórico" section — reverse-chronological phase
  timeline, one card per phase transition with phase name (colored,
  clickable) + date + relative duration · "Editar visualização do card" link
  at the bottom to customize which sections render.
- **Middle**: "Fase atual" badge showing the current phase name + a gear
  icon (opens that phase's settings) + "Compartilhar" link, then the
  current phase's own fields rendered as a live editable form (autosaves on
  blur — no explicit save button, no confirmation toast on this
  particular save, unlike the field-editor "Configurações atualizadas."
  toast).
- **Right**: "Mover card para fase" — a single-click button naming the
  *next* phase (moves forward one phase in the pipe's order), plus
  "Configurar mover cards" (link to move-automation config) and "Mover
  cards com IA" (AI-assisted phase move, out of scope to really implement —
  model as a no-op/manual action in the clone).

**Move behavior.** Both drag-and-drop on the Kanban board (card → column
header area) and the detail view's "Mover card para fase" button produce a
toast ("Card movido com sucesso para <Fase>. Para reabri-lo, clique aqui")
and a `Histórico` entry. A card in a `done: true` phase renders with a
checkmark icon + a "<N>min" elapsed-time badge in place of column
position, and its title text is dimmed/grayed vs. cards in non-done phases.

**Non-cloneable UI quirk (do not reproduce):** phase column card-count
badges do **not** live-update in the same client session after a
drag-and-drop or quick-move — they only reflect the correct count after a
full page reload. This is Pipefy's own client-cache staleness bug, not a
feature; the clone should update counts synchronously on move.

## 12. Database Tables (Iteration 4, live UI test)

Tested end-to-end: created a real Database ("Suppliers") from the org
Início > Databases tab, added fields, created a record, edited it, and
opened Configurações de database.

**Create flow.** Início > Databases tab (next to Pipes) has an empty state
(promo video + "Criar database" CTA) or, once ≥1 exists, a grid list.
"Criar database" opens a name-only modal ("Nome do database") — no template
picker, no field setup at creation time; it lands directly on the new
database's empty grid view at `/apollo_databases/:id` with a single
"Título" column and a "Criar registro" FAB.

**Field-type palette (grid `+` button) — confirms + extends feature-003's
type system.** Same config-modal shape as the Fases editor (Título do
campo, Escolha o tipo, Descrição/Texto de ajuda/obrigatório toggles, live
preview pane, "Dependências do campo" link). Full palette observed via the
grid's column `+`: Responsável, Anexo, Texto curto, Checkbox, Documentos,
Moeda (with its own currency-code sub-type, e.g. "USD - US Dollar" —
**new: currency fields have a nested currency-type selector** not
documented in feature-003), Data, Data e hora, Data de vencimento, Email,
ID, Etiquetas, Texto longo, Numérico, Número de telefone, Seleção de única
opção (radio, vertical/horizontal), Seleção de lista (dropdown select),
Texto fixo (statement), Tempo, and a separate **"Campos de conexão"**
group containing only **Conexão de database** (a table-to-table connector —
narrower than the phase-field `connector` type, which can target a pipe
*or* a table). The **Formulário inicial** settings tab's own palette
additionally lists **"Conteúdo dinâmico"** — a field type not seen in the
Fases editor at all; not yet tested, flag for a follow-up pass.

**"Dependências do campo" is read-only impact analysis, not a rule editor.**
Clicking it opens "Nenhuma dependência encontrada" (when nothing references
the field) with an info note: "Apps e integrações também podem depender
deste campo, mas ainda não estão listados aqui." This is unrelated to the
phase-level Field Conditionals (feature-009) — it's a "what would break if
I change this field" viewer, not a conditional-logic system. Model as a
derived/computed view in the clone (which reports/automations/other fields
reference a given field), not as stored data.

**Confirmed staleness quirk, same family as feature-004's Kanban count
bug:** saving a new field via the grid's `+` picker does NOT render the new
column in the grid until a full page reload — even though the save
succeeded server-side (confirmed by re-opening the field editor and seeing
"já está em uso" (label already in use) validation on the *supposedly
unsaved* field). Same quirk on record creation: a newly created record's
own submitted field values render as "Vazio" (empty) in the grid row until
reload, and the "N registros em <name>" header count does not update
either. **The clone must render both immediately, no reload required.**

**Record creation.** "Criar registro" opens a compact form modal listing
only the *non-title* fields (no separate "Título" input, unlike Cards'
start form) — "Compartilhar formulário" and "Editar" links sit top-right of
the same modal. **Currency fields auto-mask raw digit input as cents**:
typing "15000" renders live as "$ 150.00" (last two digits become the
decimal part) — a masked-input behavior the clone should replicate for
`currency`-type fields.

**Record detail view** opens as a modal at a deep-linkable URL
(`/apollo_databases/:dbId/records/:recordId`): icon + title (auto-derived
from whichever field is configured as "Título do registro" — see below) +
a status/first-choice-field badge with a dropdown chevron next to it,
"Informações de registro" (creator + relative timestamp), each field
rendered as label + value with a hover-revealed "Editar" pencil that turns
it into an inline editable control (radio group / input) with
Salvar/Cancelar, and a footer "Atualizado em" absolute timestamp that
updates live on save. A "⋮" kebab menu offers "Editar campos" (choose which
fields render on this record) and "Deletar registro" (destructive, not
tested — triggers what is presumably a confirm dialog, skipped per the
no-dialogs rule). **Observed bug in the target (do not reproduce): the
title-row status badge does not refresh after an inline field edit** — it
kept showing the pre-edit value ("Ativo") even after a fresh page
navigation, while the field's own value below correctly showed the updated
"Inativo" and the grid row was also correct. Genuine target-app desync
between the header badge and the field data, isolated to that one badge.

**Configurações de database (Gerenciar > Configurações de database)** — the
concrete UI behind feature-005's `public` boolean and more:
- **Título do registro**: a dropdown selecting *which field's value* is
  used as the record's display title — **record titles are NOT hardcoded
  to "first field created," unlike Cards (whose title comes from the
  start form's first field and never re-derives).** This is a real schema
  difference between Pipes/Cards and Databases/Records worth preserving in
  the clone: `tables.title_field_id` (nullable fk into `table_fields`).
- **Subtítulo do registro conectado**: a template/field picker for the
  subtitle shown when this record is referenced from elsewhere (e.g. a
  connector field) — defaults to "Criado em".
- **Texto do botão de criar registros**: customizable button label
  (defaults to "Criar registro").
- **Permissões**: "Database público" (all org members can access) vs.
  "Database privado" (admins + invited people only) — radio, maps 1:1 to
  `tables.public`.
- **Autorizações**: a single checkbox, "Todas as pessoas neste database
  podem criar, editar e deletar registros" — a table-wide CRUD-permission
  toggle (finer-grained per-person permission is presumably gated behind
  "Pessoas" tab, not tested this pass).
- **Excluir database**: destructive, not tested.

Screenshots: `screenshots/inspect/database-grid.jpg`,
`screenshots/inspect/database-record-detail.jpg`.

## 13. Automations Engine (Iteration 5, live UI test)

Full detail in `prd.json` feature-010. Pipe-scoped trigger→action rule
builder at Gerenciar > Automações (`/pipes/:id/automations`), structurally
separate from the per-phase Field Conditionals (§10) — conditionals only
show/hide fields on a form; Automations perform side effects (move cards,
write field values, call HTTP endpoints, distribute assignees, etc.) and
have their own run history.

**List view**: search, Filtros, sort, per-row enable/disable toggle, kebab
(Editar/Duplicar/Excluir), empty state = two-icon diagram + "Nova
automação" CTA.

**Builder** is a two-column "Sempre que... / Faça isso..." picker:
- **10 trigger types**: card enters a phase, field updated, card created,
  recurring activity, alert triggered, card exits a phase, email received,
  all connected cards moved to a phase, HTTP-request-automation response
  received, Interfaces button clicked.
- **12 action types**: ask AI, send a task, move a card, update a field on
  the card/registro, create a connected card/registro, create a
  card/registro, move the parent card, distribute assignees, apply a
  formula, make an HTTP request, apply SLA rules, send an email template
  (this last one rendered greyed-out/disabled in the trial org — likely
  plan-gated, not confirmed).
- Each trigger/action opens its own inline config card. The "update a
  field" action's value input has a **token/variable picker** (a "+"
  button opening a searchable, categorized dropdown: Atributos de evento,
  Atributos gerais [Criado em, Fase atual, Data de vencimento, Finalizado
  em, ID, A última fase em que o card estava, Título], then one group per
  phase name listing that phase's own fields). Inserted tokens render as
  removable pills in the value field — this is the templating mechanism
  the clone's action-value strings need to support (`{{token}}`-style
  interpolation resolved against the triggering card at run time).

**Confirmed end-to-end** (built and fired a real rule): trigger = card
enters "Fazendo"; action = update the "Caixa de entrada" phase's "Nome do
solicitante" field with a token pointing at the start form's own "Nome do
solicitante" field. Saved (prompts for a rule name in a small modal), then
dragged a real card into "Fazendo" — Logs showed a new row (automation
name, card name, card id, status "Sucesso", timestamp) within seconds, and
opening the card confirmed the target field's value was actually written.

**Build-critical finding**: the action's target field is **not** scoped to
the trigger's destination phase. "Fazendo" has zero fields of its own, yet
the rule successfully wrote to a field belonging to a completely different
phase ("Caixa de entrada"). The clone must model automation actions as
free references to any field id in the pipe (start form or any phase), not
as "the fields available on the phase this trigger fires for."

Not yet tested this pass: the other 9 triggers and 11 actions (in
particular the HTTP-request round trip, recurring activities, and formula
action) — only the phase-enter → update-field pair was exercised.
Screenshot: `screenshots/inspect/automations-builder.jpg`.

## 14. Reports & Dashboards (Iteration 6, live UI test)

Tested both analytics surfaces end-to-end in a real pipe (`Purchase Requests`,
id 307273712), creating a real saved Report and a real saved Dashboard/chart.

### Relatórios (Reports) — `/pipes/:id/reports_v2`
- List view: search box, "Ordenar por: Nome", a tile grid of saved reports
  (each tile shows a live result-count badge, e.g. "1") plus a "Criar novo
  relatório" tile.
- Builder (`/reports_v2/new`): left rail "Adicionar filtro" opens a searchable,
  grouped field picker (`Geral > Atributos do Card`, then `Fases > <phase> >
  <fields>`) — identical grouping to the Automations token picker
  (`spec-build.md §13`, `prd.json` feature-010). Selecting a field opens an
  operator radio list (é / não é / contém / não contém / é desconhecido /
  existe) plus a value input for value-bearing operators; applied filters
  render as removable chips with "e"/"ou" (AND/OR) buttons to combine more
  conditions, and a bottom "ou" row to start a new OR'd group.
- Results render as a live table (auto-updates as filters are added — no
  separate "run report" step) with columns: Título, Fase atual, Criador,
  Criado em by default.
- Top-right icons: **Σ** (formulas — greyed out/disabled with tooltip "Escolha
  os campos para fazer fórmulas" until a numeric field is selected; not
  further tested this pass), **column picker** (same grouped-field checklist
  as the filter picker, toggles which columns render), **export** (opens an
  "Exportar Relatório" modal offering Email or Download).
- Save flow: clicking "Salvar" prompts a name-only modal ("Digite o nome do
  seu novo relatório"); saving redirects to `/reports_v2/:reportId` and the
  report now appears as a tile back on the list view.
- **Confirmed live-query behavior**: the report is NOT a frozen export — it
  re-evaluates the filter against current card data every time it's opened.

### Painéis (Dashboards) — `/pipes/:id/dashboards`
- Empty state: "Nenhum painel criado" + "Criar painel" CTA (matches the
  Report/Database "name-only creation modal" pattern used across the product).
- A pipe can have multiple named Dashboards, listed in the left rail under
  "Meus Painéis" alongside a persistent "Explorar dados" link (ad-hoc query
  surface, not yet tested).
- Each Dashboard is an empty grid until you "Adicionar gráfico". The chart
  builder has three top-level pickers — **Métrica**, **Dimensão**, **Grupo de
  tempo** — each a searchable "+" dropdown scoped to the current pipe. Metric
  options observed (all pipe/card-scoped aggregations, grouped under the pipe's
  own name in the dropdown): Anexos do Card (Total), Cards (Total),
  Comentários do card (Total), Lead Time (horas) - Min, Lead Time (horas) -
  Somatória, Lead time (horas) - máx, Lead time (horas) - média, Responsável
  (Total).
- Picking a metric auto-populates a default title (`"<Metric> Por <Grouping>"`,
  e.g. "Cards (Total) Por Dia"), a default time dimension (`Criado em`), time
  range (`Desde o início`), and grouping (`Por Dia`) — all independently
  editable via their own chip.
- **Visualização** section lets you pick one of 8 chart types: Área, Barra,
  Calendário, Linha, Número, Pizza, Dispersão, Tabela. Confirmed switching
  type changes downstream config: selecting "Número" collapsed "Por Dia" time
  grouping to "Sem agrupamento" and the auto-title dropped the "Por Dia"
  suffix, rendering a single live KPI value (e.g. "1") instead of a line
  series.
- The chart preview updates live below the config form (confirmed: a
  freshly-created card showed up immediately as a single point on a line
  chart, and as "1" on a number tile — no reload needed, unlike the Kanban/
  Database staleness quirks documented in feature-004/005).
- Save flow: "Salvar gráfico" opens a modal with a name field (pre-filled from
  the auto-title) and a "Selecione o painel" dropdown (which Dashboard the
  chart is added to — supports adding a chart to any existing dashboard, not
  just the one you started from). On save, a toast "Gráfico criado. Confira!"
  appears and the chart renders as a tile on the dashboard grid with a
  drag-resize handle (bottom-right corner) — a freely arranged widget grid,
  the same underlying pattern as feature-008's Interfaces page layout.
- Per-chart kebab menu: Recarregar gráfico, Editar gráfico, Duplicar gráfico,
  Excluir gráfico. Per-dashboard kebab menu (top-right, next to "Adicionar
  gráfico"): Exportar painel em PDF, Definir permissões, Excluir painel.
- A dashboard-level date filter chip ("Filtro: Desde o início") sits next to
  "Adicionar gráfico", applying a default time range across all charts on
  that dashboard (not yet tested whether per-chart time ranges override it).

Screenshots: `screenshots/inspect/reports-list.jpg`,
`screenshots/inspect/dashboard-number-chart.jpg`,
`screenshots/inspect/dashboard-panel.jpg`.

## 15. Pipe Settings — Pessoas, Configurações do pipe, Atividades, Ferramentas, Lixeira (Iteration 2, live UI test)

Deep-dove the remaining five entries in the Gerenciar dropdown (`prd.json`
feature-013 through feature-017). All are modals layered over the current
pipe page rather than dedicated full-page routes, except Pessoas and
Configurações do pipe which share a tabbed "Configurações" modal with
Formulário inicial/Fases/Email.

### Pessoas — `/pipes/:id/settings/members`
Member list (Nome/Função columns) + "Convidar pessoas" + search. The Função
dropdown enumerates 4 roles (Membro do pipe, Admin do Pipe, Somente leitura,
Visão restrita), each with a one-line permission description; in this trial
org only Admin do Pipe was free — the other 3 were tagged "Upgrade". Per
spec-inspect.md's paywall exclusion, the clone implements all 4 roles with no
gating. Did not test "Convidar pessoas" (would send a real email to a second
address). See `prd.json` feature-013.

### Configurações do pipe — `/pipes/:id/settings/general-settings`
The single largest settings surface: identity (icon/name/tags), item naming,
create-button label, default view + **"Título do card" field picker (the
`title_field_id` config — see the corrected Card section above)**, Kanban
card-face field picker, connected-card field chips, a **pipe-wide** "Alerta de
expirado" (Tempo+Unidade+business-days-only toggle — distinct from the
per-phase "Alerta de atraso" SLA in §Phase), Privacidade e visibilidade,
2 AI-tool toggles, 3 edit-permission toggles, Clonar pipe, and a destructive
Excluir pipe banner (not clicked). See `prd.json` feature-014.

### Atividades (audit log) — modal, no dedicated route
Two tabs: **Atividade de cards** and **Alterações de configuração**, both
with Data e hora / Executado por / Tipo de recurso / Detalhes columns, a
"Buscar por autor" search, and "Exportar logs". The header text ("Acesse via
API ou saiba mais") implies a public read API backs this log. Every mutating
action from prior iterations (pipe creation, field creation ×2, card
create/move/complete, automation creation) appeared here as a human-readable
sentence, live, in the correct tab — this is the mechanism that let this
iteration cross-confirm the `title_field_id` finding above (the config-change
tab literally recorded `Atualizou a configuração do título do card de "—"
para "Nome do solicitante"`). See `prd.json` feature-015.

### Ferramentas — panel (Apps / Conexões / Etiquetas / Gerador de PDF)
- **Etiquetas** (Labels): confirmed end-to-end by creating a real label
  ("Urgente", default color `#35FFDD`) — name + hex color, persists
  immediately with no reload needed. Supersedes feature-001's original
  placeholder `labels: {id, name, color}` model with a UI-confirmed one. See
  `prd.json` feature-016.
- **Conexões** and **Gerador de PDF** deep-dived iteration 7 — see §20 below
  for the full flow (both confirmed end-to-end with a real created
  connection and a real rendered/downloadable PDF template). See `prd.json`
  feature-021 (Conexões) and feature-022 (Gerador de PDF).
- **Apps**: not deep-dived — third-party marketplace, out of scope (same as
  Integrações).

### Lixeira (trash) — modal, tagged "Beta"
Single "Cards" tab. Subtext: "Os cards ficam aqui por 15 dias. Depois disso,
não podem ser restaurados." Empty state: "A lixeira está vazia. Os cards
excluídos aparecerão aqui."

**Delete + restore flow confirmed end-to-end (Iteration 10, live test)** using
a disposable "Throwaway Test Card": the card-detail delete entry point is a
'⋮' kebab menu item labelled **"Mover card para a lixeira"** (not "Excluir"),
whose confirmation dialog reads "Admins do pipe podem restaurar o card
'<title>' da lixeira em até 15 dias" — **restore is gated to the Admin do
Pipe role**, not available to all pipe members (ties into feature-013's role
model). Deleting is synchronous: the card vanished from the Kanban board and
the phase's card count decremented immediately, no reload needed. A populated
Lixeira row shows the card title, a relative timestamp, and "De <phase
name>" — the phase the card was deleted from. Clicking "Restaurar" is
**asynchronous**: toast reads "Restaurando o card. Atualize em instantes para
vê-lo." and the Lixeira list empties immediately (optimistic UI) while the
restore is still pending server-side; after ~15-20s + reload the card
reappeared on the Kanban board **back in the exact phase it was deleted
from** (not a default/first phase). Permanent-purge timing past the 15-day
window is still unconfirmed (background job vs. lazy-on-view) — would require
waiting out the retention window. See `prd.json` feature-017.

Screenshots: `screenshots/inspect/pipe-settings-pessoas.jpg`,
`screenshots/inspect/pipe-settings-configuracoes.jpg`,
`screenshots/inspect/lixeira-populated.jpg`,
`screenshots/inspect/lixeira-restored-on-kanban.jpg`.

## 16. Pipe Creation Flow & Início Dashboard (Iteration 3, live UI test)

Deep-dove the org-level Início dashboard's pipe-creation entry point — the
last remaining piece of feature-001 (Pipe entity, priority 1, core), which had
been docs-only/TBD since it was defined in iteration 1 even though pipe
creation itself was exercised once (out-of-band, to escape the empty-org
onboarding modal) without documenting the flow's UI/behavior back into the
spec.

**Two-step modal flow.** From Início, the "Criar pipe" (+) tile in the Pipes
grid opens a template-gallery side modal: search box + a "Categorias de
processos" left rail (Administrativo e Facilities, Atendimento ao Cliente,
Cadeia de Suprimentos, Compras, CSC, Finanças e Contabilidade, Jurídico,
Marketing, ...) filtering a grid of "AI Studio" template cards (P2P, Onboarding,
CRM, SRM, Quotation, Claims, ...), with two CTAs pinned at the bottom:
"Criar pipe do zero" and "Criar com IA" (AI-prompted pipe generation, not
tested this pass). Clicking "Criar pipe do zero" opens a second, minimal modal
stacked on top: a single "Nome do pipe" input, "Criar pipe" submit disabled
until non-empty — the same two-step shallow-form pattern as feature-005's
Database Table create flow (which skips straight to the name-only step, since
Database Tables have no template gallery).

**Server-side side effects of creation.** Submitting with just a name
(tested: "Onboarding Clientes") redirects immediately to the new pipe's Kanban
board at `/pipes/:id` (new sequential-ish numeric id, e.g. `307274068` next to
the org's existing `307273712`). Two things happen server-side that the create
form gives no control over:
1. **3 default phases are auto-provisioned** — `Caixa de entrada` / `Fazendo` /
   `Concluído`, identical in name and order to the org's pre-existing
   "Purchase Requests" pipe, each starting at 0 cards. This is a fixed starter
   template applied to every new pipe, not an empty board.
2. **A color is server-assigned.** Neither creation modal exposes a color
   picker. Confirmed non-trivial by creating two pipes back to back: "Purchase
   Requests" shows a teal grid-card swatch, "Onboarding Clientes" (created
   this pass) shows green — so it isn't a static default, and it isn't a hash
   of the name either (nothing about "Onboarding Clientes" vs "Purchase
   Requests" explains teal vs. green beyond "assigned from some rotation/pool
   at creation time"). Color remains user-editable afterward via Configurações
   do pipe (§15) — so the clone should auto-assign *some* color on create
   (e.g. cycling a fixed palette by creation order) and separately expose it
   as an editable setting, rather than tying it to the name.

**Home grid card.** Back on Início, each pipe renders as a card: colored icon
square (bento-box glyph, same glyph for every pipe — only the background color
differs) + name + "N cards" (live count, confirmed 0 for the freshly created
pipe vs. 1 for "Purchase Requests").

**Network shape (informational only).** `read_network_requests` during
creation showed the SPA calling a single batched `POST
https://app.pipefy.com/internal_api` endpoint rather than discrete REST calls
per action. This confirms there's no literal endpoint contract worth mirroring
— the clone's own API (conventional REST/JSON per §6/§7) should be designed
from observed *behavior*, not from replaying Pipefy's internal transport.

Screenshots: `screenshots/inspect/home-pipes-grid.jpg`,
`screenshots/inspect/pipe-create-modal.jpg`.

## 17. Emails — Shared Team Inbox (Iteration 4, live UI test)

Deep-dove the pipe-level Emails tab (`/pipes/:id/emails`) and its settings
surface (Gerenciar > Email, `/pipes/:id/settings/email`) — the top item on
`sitemap.md`'s not-yet-inspected list and a whole feature area with zero
prior `prd.json` coverage. Full detail is in prd feature-018.

**Everything is card-scoped — there is no freeform compose.** "Compor email"
first opens a card-picker popover ("Selecione um card para escrever uma
mensagem") with search; there is no way to send a Pipefy-hosted email that
isn't attached to a card. Picking a card navigates to
`/pipes/:id/emails/:threadId` and opens a fully-formed compose UI in place.

**Two distinct generated addresses, easy to conflate.** The pipe has one
*inbound* alias for routing external mail into the pipe as new cards
(`pipe{pipeId}@mail.pipefy.com`, shown in the left rail and in Gerenciar >
Email, off by default via a toggle). Separately, every email *thread* gets
its own generated *outbound* alias as its "De" address
(`pipe{pipeId}+{randomToken}@mail.pipefy.com`) — confirmed by inspecting the
compose form's "De" field for the one test card. These are different
mechanisms (org-wide inbound routing vs. per-thread outbound identity) that
must not collapse into a single `pipe_email_alias` field in the clone's data
model.

**Compose form fields:** Nome (free-text sender display name, prefilled to
the logged-in member), De (the generated per-thread alias, shown as a
non-editable chip), Para (typed addresses tokenize into removable chips on
blur/comma — confirmed with `teste@example.com`), CC/CCO toggles, Assunto,
a rich-text body editor, "Adicionar assinatura", and a footer with
Enviar / anexar arquivos / Respostas salvas (saved quick-replies) /
Aplicar template / Cancelar / delete.

**Thread-level metadata, separate from the card's own fields.** A toolbar
above the compose pane exposes Adicionar responsável, Vencimento, Adicionar
etiquetas, Marcar como não lido, and Imprimir tudo — these attach to the
*email thread*, not to the card, and are the same left-rail axes the inbox
filters on (Atribuídas a mim / Sem responsável). The right-hand pane
mirrors the card: title, current phase, and the same one-click
"Mover a fase" quick-mover confirmed in §11's Card detail view — so acting
on an email can move its card without leaving the Emails tab.

**Email Templates reuse the shared token-picker component.** "Meus
templates" > "Criar um novo template" opens a template editor (Nome do
template, Nome do remetente + "Endereço de email customizado" toggle, Email
do remetente, Email do destinatário with CC/CCO, Assunto, body) whose body
editor has a "Conteúdo dinâmico" pill — the *same* categorized field/token
picker component already confirmed in feature-010 (Automations' variable
picker) and feature-011 (Reports' filter/column picker). This is now
confirmed reused across three independent features; the clone should build
it once as a shared component, not per-feature.

**Not triggered, by design:** clicking Enviar on a real message (would
actually deliver mail — same "don't trigger irreversible external actions"
policy already applied to feature-011's Email/Download export), and
toggling "Endereço de email do pipe" on (would make an inbound-routing
address live). Both were filled/opened to document their shape, then
cancelled/left at default.

Screenshots: `screenshots/inspect/emails-inbox.jpg`,
`screenshots/inspect/emails-compose.jpg`.

## 18. AI Agents (Iteration 5, live UI test)

Deep-dove the pipe-level Agentes de IA tab (`/pipes/:id/ai_agents`) — the top
item on `sitemap.md`'s not-yet-inspected list and a whole feature area with
zero prior `prd.json` coverage. Full detail is in prd feature-019.

**A 3-step builder, one agent = many behaviors.** "Criar novo agente" opens
a left-rail wizard: (1) Geral — name + a free-text role/objective
description; (2) Conhecimento — attach RAG sources (Pipe ou base de dados,
Documento, or the new Texto simples type, which is a Nome + "Quando usar
este conhecimento" retrieval-trigger hint + Conteúdo — i.e. an explicit
per-chunk retrieval description, not just raw text); (3) Comportamentos —
where each behavior is its own independent trigger→instructions rule,
and a single agent can hold multiple behavior cards via "+ Adicionar novo
comportamento".

**Behaviors reuse Automations' trigger vocabulary almost exactly.** The
"Sempre que..." trigger picker exposes the same 9 event types confirmed in
feature-010 (Automations), minus the recurring-activity trigger. Selecting
a phase-based trigger reveals a live "Para fase" dropdown populated from the
pipe's actual phases. **UI quirk to reproduce faithfully:** picking a value
in that phase dropdown visually closes the trigger modal without needing
the explicit "Adicionar gatilho" submit click — build the equivalent modal
behavior rather than "fixing" it into always requiring an explicit save.

**The instructions box's `/` palette is the 4th confirmed reuse of the
grouped field/token-picker component**, after Automations (feature-010),
Reports (feature-011), and Email templates (feature-018). It exposes an
"Ações" group (update card fields, create card, create connected card,
create record, send email template, move card) followed by "Atributos do
card" (12 card-level fields) then one group per phase name listing that
phase's own fields. The clone should implement this picker once, parameterized
by `{actions[], cardAttributes[], phaseFieldGroups[]}`, and reuse it across
all four features rather than four separate implementations.

**Per-behavior model/skills/effort controls, not agent-wide.** Each
behavior card has its own bottom toolbar: a model-tier picker (org default,
then Classic [deprecation banner: retires 2026-10-01 → auto-migrates to
Standard at the same per-execution cost], Lite, Pro [shows live rolling
credit cost], Standard); a Skills toggle row (Análise de documentos,
Pesquisa na Web, Cálculos e análises); and an Esforço "Máximo" reasoning
toggle (Beta, gated to Pro). Model the clone's schema so these live on
`ai_agent_behaviors`, not on `ai_agents` — a build-critical distinction,
since the wizard's "Geral" step (agent-level) never surfaces them.

**Non-obvious side effect: agent creation is NOT client-only-until-save.**
Clicking "Criar novo agente" immediately persists a draft server-side —
confirmed because after filling in name/description/a trigger and then
explicitly discarding via the in-app "Sair sem salvar?" confirm modal, the
agent list still showed a new row with a "Rascunho" status badge. This
contrasts with every other create-flow inspected so far (Automations,
Database Tables, Pipe creation) which stay client-side until an explicit
save. Deleting a saved/draft agent requires typing the literal word
"deletar" into a confirm input before the delete button activates —
the same type-to-confirm pattern should extend to any other destructive
delete the clone implements, not just this one.

**Sub-tabs, briefly surveyed:** Logs (Agente/Comportamento/Card
processado/Status/Horário de início columns, date-range display, "Filtrar
por" dropdown, empty state) shares its run-log shape with
`automation_runs` (feature-010) — model both as the same underlying
`ai_agent_runs`/`automation_runs` pattern (id, ref to the rule, card_id,
status, timestamps, message). Templates is a 9-card gallery (3 "por
função": extract-data / summarize / sentiment; 6 "por área": compliance,
HR, legal, accounts-payable, operations, procurement) — build this as
seed data for an agent-behavior preset, not a separate entity. MCP is an
empty state pointing at external tool connections; its "Adicionar
conexões" CTA did not open a working modal in this trial org (likely
plan-gated) — out of scope for the clone's own API-only backend.

**Not triggered, by design:** actually saving-and-firing a behavior end
to end (would consume real AI credits) and the MCP connection flow.

Screenshots: `screenshots/inspect/ai-agents-empty.jpg`,
`screenshots/inspect/ai-agents-behaviors-builder.jpg`,
`screenshots/inspect/ai-agents-templates.jpg`.

## 19. Interfaces Builder & Per-Page AI Assistant (Iteration 6, live UI test)

Live-tested the Interfaces no-code page builder end-to-end (prd feature-008,
previously docs/sitemap-derived only) by creating a real interface
("Central de Testes") and populating it with both core widget types.

**Creation flow:** `Criar interface` opens a small modal — Nome (text),
Ícone (icon picker), and a `Privacidade da interface` dropdown with 3
tiers: `Restrito a pessoas selecionadas` (default) / `Restrito a <org>` /
`Público para todos com o link`. This exact 3-tier privacy model reappears
in the `Compartilhar` modal later, so model it as one shared
`privacy_tier` enum used at both creation and share time. Submitting
routes straight into the page editor — no separate confirmation step.

**Editor layout:** left sidebar `Gerenciar páginas` (a tab list of pages
within this interface + `Adicionar página` for multi-page interfaces),
a center WYSIWYG canvas that mirrors the live page's own chrome, and a
right panel with 2 tabs — `Adicionar elementos` (the widget palette) and
`Editar página` (per-page Nome + `Mostrar cabeçalho` toggle). **Elements
are drag-only**: clicking a palette item does nothing; only
`left_click_drag` onto the canvas places it — confirmed by testing both
(build systems driving this UI programmatically must simulate a real
drag, not a click). The header shows autosave state cycling `Sem
alterações` → `Última alteração em <timestamp>` → `Alterações salvas`
(checkmark) — there is no explicit save button anywhere in the builder.

**Element palette** (grouped): *Elementos principais* — Dados,
Formulários (AI-assist badge), Documento (`Novo` badge + AI-assist
badge). *Layout e conteúdo* — Texto, Link, Divisor. *Mídia* — Imagem,
Vídeo, Incorporar. Dados and Formulários deep-dived iteration 6;
Documento/Texto/Link/Divisor/Imagem/Vídeo/Incorporar deep-dived
iteration 8 — see §21.

**Dados widget (live-query data table):** binds via `Selecione um pipe ou
database`, the SAME org-scoped catalog list used by Automations
(feature-010), Reports (feature-011), Dashboards (feature-012), Email
templates (feature-018), and Formulários below — now confirmed reused
across **5 independent features**; build this catalog picker as one
shared component. Picking a source auto-populates the widget's title
(editable, toggleable) and the table immediately live-queries and
renders that source's real records — tested selecting "Purchase
Requests" and seeing its actual card ("João Silva") render after a brief
loading-skeleton state. Config surface: `Tornar linhas clicáveis`
(row-click opens the record), `Permitir que admins exportem os
registros` (on by default), `Ordenar por` (field + direction), and
`Visibilidade dos dados › Definir condições` — a filter popover offering
3 one-click **dynamic, viewer-scoped** presets (`Atribuído ao
visualizador` → inserts `Responsáveis = Usuário atual`; `Fase atual`;
`Para esta semana`) plus a full custom AND-chained condition builder with
`Adicionar grupo de condições` for OR-groups. **Confirmed the dynamic
condition re-evaluates per logged-in viewer at render time, not at save
time**: applying `Atribuído ao visualizador` immediately live-re-queried
the table to `Nenhum registro encontrado` because the test card wasn't
assigned to the viewing user. This is the build-critical finding of this
widget — visibility filters must support a `$CURRENT_USER`-style token
resolved against the request's authenticated viewer, not the page
author. Removing all conditions requires a confirm dialog.

**Formulários widget (start-form launcher):** binds via the same
pipe/database picker, plus page-scoped Nome/Descrição/imagem overrides
explicitly labelled "Alterações afetarão apenas esta página" — these are
presentation overrides only, they do not write back to the underlying
pipe. Once bound it renders as a clickable icon+name card. In the LIVE
view, clicking it opens the target pipe's real public start form as a
modal (confirmed: real `Nome do solicitante` field + `Criar novo card`
submit) — i.e. this widget is a **launcher for actual card creation**,
not a duplicated/mocked form renderer. Cancelled before submitting to
avoid creating a spurious card.

**New discovery — per-page AI Assistant.** Every published/live
Interfaces page auto-mounts a floating "AI Assistant" (Beta) chat widget,
bottom-right. On a viewer's first visit to a given page it auto-expands
to a full panel: headline "Encontre respostas e avance com suas
solicitações", 4 canned prompt chips (`Ver minhas solicitações` /
`Iniciar solicitação` / `Resumir políticas e informações` / `Mostrar o
que posso fazer aqui`), a freeform `Perguntar algo...` input, and a
disclaimer footer. On later visits it stays collapsed to a small pill
until clicked. The builder's own copy on the Formulários/Documento
element panels ("O Assistente de IA aprende com este elemento para
responder perguntas dos usuários") confirms the assistant's context is
**scoped to that specific page's bound elements**, not the whole org.
Did not send a real prompt (avoids an AI-credit cost) — added as new prd
feature-020, modeled per project rules as a lightweight scoped Q&A stub
(canned/templated answers over the page's bound pipe/database data)
rather than real LLM orchestration.

**Sharing:** `Compartilhar` opens a 2-tab modal — `Visibilidade` (the
same 3-tier privacy dropdown + a copyable public URL) and `Gerenciar
pessoas` (deep-dived iteration 8, see §21). `Ver ao vivo` opens the
published page in the same tab, with the URL simply dropping the `/edit`
suffix.

**Not triggered, by design:** submitting the Formulários launcher's start
form (would create a real card) and sending a real AI Assistant prompt
(would incur AI credits).

Screenshots: `screenshots/inspect/interfaces-builder.jpg`,
`screenshots/inspect/interfaces-live-view-ai-assistant.jpg`.

## 20. Ferramentas > Conexões & Gerador de PDF (Iteration 7, live UI test)

Deep-dived the two remaining un-tested Ferramentas sub-tabs (see §15). Both
confirmed end-to-end with real created objects.

### Conexões — pipe-to-pipe / pipe-to-database data connections
Empty state: single illustration + "Criar conexão" CTA. The creation form:
- **Nome da conexão** — free-text label for the connection (shown later in
  the pipe's top-nav "Conexões" dropdown and as the card-tab title).
- **Selecione um pipe ou database para conectar** — a single-select dropdown
  grouped into two sections: **Pipes** (other pipes in the org) and
  **Tabelas** (Database Tables, feature-005). Confirms connections target
  either object type through one unified UI.
- **Escolha o que as pessoas podem fazer com a conexão** — 3-way radio:
  "Pesquisar cards ou registros existentes" (search-only) / "Criar novos
  cards ou registros" (create-only) / "Pesquisar e criar" (both). Governs
  whether the card-level connection widget offers search, create, or both.
- **Número de cards ou registros que podem ser conectados** — 2-way radio:
  "Um único card ou registro por card principal" (1:1) vs "Vários cards ou
  registros por card principal" (1:N).
- **Opções avançadas** (5 toggles, all off by default):
  1. Um card conectado deve ser criado para que o card pai possa ser movido
     para a próxima fase
  2. Um card conectado deve ser criado para que o card pai possa ser movido
     para a fase final
  3. O card pai não pode ser movido para a próxima fase até que todos os
     cards conectados tenham atingido a fase final
  4. O card pai não pode ser movido para a fase final até que todos os
     cards conectados tenham atingido a fase final
  5. Preencher automaticamente os campos de um card com informações do card
     conectado (auto-fill from the connected record)

Created a real connection named "Fornecedores" targeting the "Suppliers"
database (feature-005's fixture). Confirmed effects:
- It immediately appears in the pipe's top-nav **Conexões** dropdown menu
  (alongside a permanent "Gerenciar conexões" item) — a per-pipe list of
  named shortcuts to each configured connection.
- It also appears back in the "Gerenciar conexões" list modal (search box +
  row per connection + delete/trash icon per row), which carries the caption
  "Atualmente, apenas as conexões com databases são exibidas na parte
  superior do pipe" (only database-target connections surface in the top
  nav — pipe-to-pipe connections presumably do not get a nav shortcut).
- On an existing card (`João Silva`), a new **"Fornecedores"** pill appeared
  in the card's tab row (alongside Form/Atividades/Anexos/Checklists/
  Comentários/Email/PDF), titled with the connection name. Its content pane
  is titled with the *target* object's name ("Suppliers") and shows an empty
  state ("Melhore a colaboração integrando seus processos e times...") plus
  a **"Criar novo Fornecedores"** button — i.e. the button label is the
  connection name, confirming the card-level widget lets a user create (or,
  depending on the radio above, search-attach) a record in the connected
  database/pipe directly from the card.

Data model: a Connection belongs to a pipe, has `name`, `target_type`
(`pipe`|`database`), `target_id`, `permission` (`search`|`create`|`both`),
`cardinality` (`single`|`multiple`), and the 5 boolean advanced flags above.
A connected record is a join between a source card and a target
card/database-record, created via the card-level widget.

### Gerador de PDF — pipe-scoped PDF export templates
The Ferramentas panel's PDF row opens a template list modal: two pre-seeded
example rows both named "Introdução (exemplo)" with an enabled (blue) toggle
each, plus a **"Criar novo modelo"** button. New templates default to their
toggle **off** (disabled) until explicitly turned on.

"Criar novo modelo" opens a full-page rich-text template editor
(`/pipes/:id/pdf_templates/new`):
- Editable title at top-left ("Título indefinido" placeholder), Cancelar/
  Salvar in the top-right.
- Toolbar: **Campo dinâmico** (dynamic field / token picker — the same
  grouped, searchable, phase-grouped component confirmed in Automations,
  Reports, Emails, and AI Agents; this is the 6th confirmed reuse of this
  component), text color, Bold, Italic, H1, H2, Underline, align
  left/center/right, link, bulleted list, numbered list, image, table,
  page-break.
- The token picker groups fields by phase (e.g. "Caixa de entrada" /
  "Start form"), inserting a field as an inline chip into the document body
  (WYSIWYG canvas below the toolbar, styled like a paper page).

Created a real template ("Recibo de Compra") with a single inserted
"Nome do solicitante" token and saved it — it appeared in the template list
(toggle off by default) and, once toggled on, in the card detail's **PDF**
tab dropdown ("Opções" → "Criar ou Editar seus modelos de Pdf's" / a
"Modelos" list of all templates including the two seeded examples).
Clicking the template from a real card (`João Silva`) navigated to
`/pipes/:id/cards/:cardId/pdf_templates/:templateId/preview` — a live
preview that resolved the token to the card's actual field value ("João
Silva"), with **"Fechar"** and **"Baixar PDF"** actions. Confirms the PDF
generator is a per-card, server-rendered document merge (title, styled rich
text, one or more dynamic-field tokens → real card data), downloadable as an
actual PDF file.

Data model: a PdfTemplate belongs to a pipe, has `title`, `enabled`
(boolean), and `body` (rich-text/HTML with embedded field-token
placeholders, e.g. `{{field:solicitante_nome}}`). Rendering a template for a
given card substitutes tokens with that card's field values and produces a
downloadable PDF.

See `prd.json` feature-021 (Conexões) and feature-022 (Gerador de PDF).

Screenshots: `screenshots/inspect/ferramentas-panel.jpg`,
`screenshots/inspect/conexoes-list-created.jpg`,
`screenshots/inspect/gerador-pdf-list.jpg`,
`screenshots/inspect/gerador-pdf-card-preview.jpg`,
`screenshots/inspect/conexoes-card-tab-empty.jpg`.

## 21. Interfaces — Remaining Content/Media Elements & Sharing Permissions (Iteration 8, live UI test)

Closed out the Interfaces builder (§19, prd feature-008/feature-020) by
live-testing the 7 element types left untested iteration 6, plus the
`Compartilhar` modal's `Gerenciar pessoas` tab, in the same "Central de
Testes" interface. Added prd feature-023 (content elements: Texto/Link/
Divisor), feature-024 (media elements: Imagem/Vídeo/Incorporar),
feature-025 (Documento knowledge-source element), feature-026 (sharing
permissions).

**Build-critical correction to §19:** every element type tested this
iteration inserted at the **top of the canvas** regardless of the
`left_click_drag` drop coordinate (tested dropping each new element near
the bottom of a long page — it always landed above the previously-added
elements instead). The builder likely has a single fixed insertion point
(or inserts adjacent to whichever element is currently selected/focused)
rather than a literal drop-position placement — the clone should not
implement pixel-accurate drop-position insertion; a "insert above the
current selection, else at the top" model matches what was observed.

**Texto** — the only element with **no side config panel**: clicking the
placed block turns it into an inline, focused WYSIWYG editor. Selecting
any text (or focusing the empty block) surfaces a floating toolbar:
`+ Conteúdo dinâmico` (the same grouped dynamic-field token picker seen in
Automations/Reports/Emails/AI Agents/PDF Generator — **7th confirmed
reuse**, build it once), a `Texto normal` block-style dropdown, Bold/
Italic/Underline/Strikethrough/text-color, bullet/numbered list, link
insert, and blockquote. Content must be stored as structured rich text
(not a plain string) to round-trip this formatting.

**Link** — side panel with `Nome` + `URL` fields only; the canvas block
live-updates as you type, rendering as a card with a link icon, the
entered name as its title, "Site" as a fixed subtitle, and an
external-link icon once a URL is present.

**Divisor** — zero configuration: dragging it onto the canvas immediately
renders a full-width horizontal rule with no side panel opening at all.

**Imagem** — side panel opens a 3-tab picker: `Imagens do Unsplash` (a
search-by-topic/color grid of real stock photos, paginated via "Ver
mais" — a real Unsplash API integration, not placeholder art),
`Carregar imagem` (direct upload), and `From URL` (paste an external
image URL). Plus `Texto alternativo` (alt text) and a `Cantos
arredondados` (rounded corners) toggle. Confirmed picking an Unsplash
photo and clicking `Aplicar` renders the real photo full-width in the
canvas immediately.

**Vídeo** — a single URL field, restricted per its own hint text to
"Somente vídeos do YouTube, Vimeo são suportados por enquanto" (copy
implies more platforms are planned) — a `Mostrar Controles` toggle.
Pasting a real YouTube URL live-embeds the actual video thumbnail +
player (tested with a public YouTube URL) — this is a real oEmbed-style
integration, not a mocked player.

**Incorporar** — a generic iframe-embed of **any** URL, with an explicit
warning ("Alguns sites podem afetar o desempenho da sua interface") and
two toggles (`Mostrar controles de navegação`, `Mostrar título/url`, both
default ON). Tested with a plain URL — it rendered a real live iframe
with a header bar (URL text + refresh + open-in-new-tab icons) above the
embedded page content.

**Documento** (`Novo` badge) — the same AI-assist banner copy as
Formulários/Dados ("O Assistente de IA aprende com este elemento para
responder perguntas dos usuários"), confirming it is a knowledge source
for the page-scoped AI Assistant (feature-020), not just a file
attachment widget. `Adicionar documento` accepts PDF only, ≤5MB.
**Confirmed non-obvious behavior:** the `Título do documento` and
`Descrição` fields are visually present and appear editable but **do not
accept typed input until a real file has been selected** via `Selecione
o documento` — metadata entry is gated behind the upload, unlike Link's
`Nome` field which has no such prerequisite. Did not upload a real file
(no disposable test PDF on hand), so post-upload behavior (does the
title auto-populate from the filename? is a text extract/preview shown?)
is **unconfirmed — TBD**. This element is conceptually the same
"knowledge source" primitive as AI Agents' (feature-019) `Documento`
knowledge-source type in its Conhecimento step (Nome + "Quando usar" +
RAG-trigger content) — model both as the same underlying document/RAG
entity, reused at the agent level (feature-019) and the page level
(feature-020).

**Compartilhar → Gerenciar pessoas:** an `Adicionar pessoas ou grupos`
search box (name/group/email) above a list of already-granted people —
this trial org's own admin user is pre-listed, tagged "É você!". Each
row has a role dropdown: **Admin da Interface** (current/checked — "Possui
acesso total à Interface. Pode adicionar pipes e databases aos quais
tiver acesso.") / **Membro da Interface** (tagged `Upgrade`, gated in
this trial org — "Pode visualizar as páginas da Interface. Só pode
atualizar campos editáveis.") / **Remover acesso** (destructive, red).
This is a simpler 2-tier version of the same person-permission pattern
as Pipe → Pessoas' 4-tier role picker (feature-013). Did not test adding
a second real person — this trial org has only one seat.

**Not triggered, by design:** uploading a real PDF to the Documento
element (no disposable test file), and inviting a second real person to
`Gerenciar pessoas` (single-seat trial org).

Screenshots: `screenshots/inspect/interfaces-elements-builder.jpg`.

## 22. Meu trabalho ("My work") & Notifications (Iteration 9, live UI test)

**Meu trabalho** (`/my-tasks` redirects to `/my-work`) is an org-level,
cross-pipe VIEW of cards assigned to the current user — a computed query
over the existing Card entity (feature-004), not a new persisted entity.
Header: "Meu trabalho" + "Visualize e gerencie os cards atribuídos a
você." + a help-doc link. 6 filter tabs, each with a live count badge:

| Tab | Definition (confirmed) |
|---|---|
| Todos os cards | All cards assigned to the current user, any pipe |
| Cards prestes a vencer | `due_date` within the next 7 days — confirmed via an on-hover tooltip: "Cards que estão a 7 dias da data de vencimento" |
| Vencidos | `due_date` already in the past |
| Atrasados | **Distinct from Vencidos** — tracks phase/SLA time-in-phase expiration (the pipe-wide expiration alert from feature-014's Configurações do pipe), independent of the card's own due date |
| Expirados | A separate pipe-level expiration rule firing (from Configurações do pipe) |
| Concluídos | Card is in a phase flagged as the pipe's "done"/final phase |

Table columns (all sortable — every header is a button): Título, Data de
vencimento (relabeled "Vencidos em" while the Vencidos tab is active),
Pipe, Fase atual, Criado em, Designado em (assigned-at timestamp).
Standard pagination footer. **Each tab's empty state is independent** —
switching to a 0-count tab shows the full empty-state block ("Parece que
ainda não há tarefas atribuídas a você. Que tal criar um card e
atribuí-lo a si mesmo? Saiba mais.") even while another tab has rows.

**Live-tested end-to-end:** assigned an existing card ("João Silva",
Purchase Requests pipe) to the current user via the card detail's
"Adicionar responsável" control, then set its Vencimento to the previous
day via the date-picker (defaults to today's date/time on first open).
Both changes reflected in Meu trabalho on the next load: "Todos os
cards" and "Vencidos" both went 0→1; "Cards prestes a vencer" and
"Atrasados" stayed at 0, confirming they're computed from different
fields (see table above).

**Notifications:** the overdue transition auto-generated a real-time
in-app notification ("O card \"João Silva\" está vencido") with **no
manual trigger** — confirmed in both the header bell's popover (title
"Notificações", "Marcar todas como lidas" link, unread red badge count
on the bell icon) and the dedicated `/notifications` page (each entry:
a type-specific icon [a red overdue-clock glyph for this case] + message
+ relative timestamp, e.g. "há 2 minutos"). The bell's unread badge
cleared automatically after visiting `/notifications` — read-state
appears to be a single "has the user opened the notification list" flag
rather than per-item click-to-read (unconfirmed whether opening the
popover alone, without navigating to the full page, also clears it).

**Not the same feature as Tarefas e Solicitações:** `/organizations/:orgId/tasks_and_requests`
(org-level "Tarefas e Solicitações" nav tab) stayed on its empty state
("Sem tarefas" / "Tudo em dia!") even after the above card was assigned
+ overdue — proving it is backed by a **different** underlying feed,
not simply "cards assigned to me". Checked the card's own "Atividades"
tab too (per-field audit log: actor/field/old→new value/timestamp) —
also not the source. What actually populates Tarefas e Solicitações
remains **unconfirmed** — flagged in `sitemap.md` for a follow-up pass;
treating it as a separate, lower-priority PRD item rather than folding
it into feature-027 (Meu trabalho) since the live evidence contradicts
that assumption.

**Account menu:** the top-right avatar button ("Conta e recursos",
tied to the org's real account name — this trial org's greeting/avatar
consistently render as "Tiago Vasconselos" even though the pipe-level
top nav shows "Claude") did not produce a visible dropdown across 3
click attempts. Per this project's spec, account/profile management is
explicitly out of scope, so this was not pursued further — the clone
should still render the avatar button as a stub control.

See `prd.json` feature-027. Screenshots: `screenshots/inspect/my-work-populated.jpg`,
`screenshots/inspect/notifications.jpg`.

## 23. Pipe-scoped Card Search & Start Form Editor Deep-Dive (Iteration 11, live UI test)

### Card Search — "Procurar cards" (Kanban top nav)

A single search input above the Kanban board, placeholder "Procurar
cards", with a clear ("x") button once text is entered, plus a separate
filter (funnel) icon immediately to its right (a distinct control, not
tested this pass). **Confirmed entirely client-side**: typing "João"
produced zero new network/GraphQL requests (checked via
`read_network_requests` — only an unrelated Intercom beacon fired),
confirming the filter runs over cards already loaded into the board's
in-memory state rather than hitting a server-side search endpoint. The
filter is **debounced**, not instant-per-keystroke or Enter-gated — it
applied a couple of seconds after the last keystroke whether or not
Return was pressed. Matching is a case-insensitive substring match
against **card title only**, applied independently within each phase
column: a "Throwaway Test Card" was hidden while "João Silva" remained,
each column's count badge updated to the filtered count, and a phase
with zero matches fell back to its normal per-phase empty-state copy
(e.g. "Aqui chegam os cards criados para este pipe") rather than a
distinct "no results" message — the empty state is not search-aware.
Clearing the box restores the full board immediately. See prd
feature-028; screenshot: `screenshots/inspect/kanban-card-search.jpg`.

### Start Form (Formulário inicial) Editor

The pipe's own **Formulário** tab (`/pipes/:id/form`, distinct from the
settings modal) is a summary surface: a card-style preview of the form,
"Visualizar"/"Editar" buttons, a live "{N} solicitações" counter with a
"Ver no pipe" link, and a "Próximos passos" tips panel — 3 static
suggestion cards ("Habilite o rastreio de solicitações", "Crie emails
padronizados", "Analise e exporte relatórios") that link out to the
Emails (feature-018) and Relatórios (feature-011) features, confirming
this panel is a cross-feature upsell surface rather than a start-form
tool.

Clicking "Editar" opens the **same** "Configurações do pipe" modal used
by Fases (feature-002) — "Formulário inicial" is just another tab
alongside Fases / Pessoas / Email / Configurações do pipe. **The start
form is modeled as phase-zero of the pipe, not a separate entity.**
Inside that tab, a toggle switches between:

- **Editar formulário** (default) — the identical field-type palette +
  per-field config panel already documented for Fases (feature-002/003):
  same 23 field types, same toggles (Descrição / Texto de ajuda /
  obrigatório / Validação customizada / Visualização compacta / editável
  em outras fases / valor único), same "Dependências do campo" link into
  Condicionais (feature-009). One confirmed start-form-specific default:
  "Este campo é editável em outras fases" defaults **ON** here (phase
  fields default it OFF), since start-form answers typically need to
  stay editable as the card advances. Adding a field autosaves instantly
  (toast: "Configurações atualizadas.") with no explicit Save needed.
- **Modo Público** (start-form-exclusive) — a config column (Editar logo
  [JPG/GIF/PNG, max 2MB] / Título do formulário / Descrição do formulário
  / Texto do botão de envio [default "Enviar"] / Cor ou imagem de fundo /
  Cor da marca [10-swatch picker, same palette family as the pipe-icon
  color picker in feature-014]) alongside a **live preview of the actual
  public form** exactly as an anonymous visitor sees it — including real
  legal/safety boilerplate ("Nunca envie senhas ou dados confidenciais
  por meio de formulários desconhecidos...", "Denunciar abuso", "Termos e
  condições" links) and a "Powered by Pipefy" footer badge. This mode
  requires an explicit "Salvar" click (button is greyed until a change is
  made) — unlike the autosaving field palette.

A separate **"Opções Avançadas"** link (top-right of the tab, alongside
Condicionais em campos) opens a small modal with 3 fields distinct from
the Modo Público fields: **Título do formulário inicial** (the internal
name shown on the pipe's own nav — separate from the public-facing
"Título do formulário"), **Texto do botão de criar cards** (default
"Criar novo card" — the internal Kanban create-button label, separate
from the public "Texto do botão de envio"/"Enviar"), and **Título do
card** (a field-picker selecting which start-form field drives
`card.title` — the same mechanism independently confirmed in feature-014's
Configurações do pipe). This has its own "Salvar opções" action, scoped
only to these 3 fields.

**Data model implication:** StartForm is Phase id=0 (or a
`is_start_form: true`-flagged phase) of the Pipe's Phase list, sharing
the Field entity/type system and Field Conditionals, plus start-form-only
columns: `public_title`, `public_description`, `public_logo`,
`public_submit_button_text`, `public_background`, `public_brand_color`,
`internal_title`, `internal_create_button_text`, `title_field_id`.

See prd feature-029; screenshot: `screenshots/inspect/start-form-editor.jpg`.
