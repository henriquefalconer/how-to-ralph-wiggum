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

**PARTIAL — org/pipe navigation mapped, page-level deep dives still TODO.**
Full detail in `sitemap.md` (mirrored here at a summary level). The trial org
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

Confirmed still-TODO for upcoming iterations: card detail view, Fases editor
(the 23 field types), Database Table creation + grid + record detail, Kanban
drag-drop, Relatórios/Painéis chart creation, Emails compose, Automations rule
builder, AI Agents creation flow, Pessoas/Configurações/Atividades/Ferramentas/
Lixeira, `/my-tasks`.

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
- **Confirmed (Iteration 3, live UI test):** `title` is set once, at creation
  time, from the *first field's value on the start form* — it does not
  re-derive if that field's value later changes, and it is a completely
  separate value from any same-labeled field owned by a phase (see field
  scoping note below). Card detail route: `/open-cards/:cardId`.

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
- [x] Site map (Iteration 1) — see `sitemap.md`
- [x] Home / pipes list (screenshot: `screenshots/inspect/home.jpg`)
- [x] Phase/field editors (Fases — field config modal, choice-type options editor, phase Opções Avançadas [done/SLA/auto-assign], Condicionais em campos rule builder — screenshot: `screenshots/inspect/phases-editor.jpg`)
- [x] Kanban board view (card create, drag-drop move, done-phase styling — Iteration 3)
- [x] Card detail view (Iteration 3)
- [ ] Start form
- [x] Database Tables (create flow, field-type palette incl. connection fields, record create/edit, Configurações de database — screenshots: `screenshots/inspect/database-grid.jpg`, `screenshots/inspect/database-record-detail.jpg`)
- [ ] Reports/dashboards
- [x] Automation rule builder (separate from field conditionals — pipe-level Automações tab; 10 triggers × 12 actions, tested end-to-end incl. Logs — screenshot: `screenshots/inspect/automations-builder.jpg`; see §13 and prd feature-010)
- [ ] Interfaces / Portal builder (new feature, not in prd.json yet)
- [ ] AI Agents creation flow
- [ ] Search
- [ ] Design system consolidated from screenshots
- [ ] Final cleanup pass + PRD reorder (spec-inspect.md "Final Iteration")

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
