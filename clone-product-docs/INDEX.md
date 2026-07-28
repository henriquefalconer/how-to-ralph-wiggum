# Pipefy Clone — Docs Extraction Index

Source: `https://developers.pipefy.com` (GraphQL API reference) and
`https://www.pipefy.com/llms.txt` (marketing/product overview).
Fetched directly as `.md` — developers.pipefy.com serves raw markdown at
`<page>.md`, no Jina Reader needed.

## overview.md
Product summary, platform layers, scope decision for the clone (see file for detail).

## api-reference/ — GraphQL API surface (core data model reference)

### GraphQL basics
- `why-graphql.md`, `graphql-structure.md`, `creating-calls-with-graphql.md`,
  `limits-and-best-practices.md`, `the-graphql-endpoint.md` — how the API is shaped;
  our clone's REST/route-handler API should mirror the same **resource shapes**
  (Pipe, Card, Field, Phase, Table, Report) even though we won't build GraphQL itself.
- `authentication.md`, `personal-access-token.md` — target's auth model (API key /
  PAT). **Out of scope to build** (project excludes auth), kept only so the SDK
  docs make sense if referenced later.

### Core entities (the heart of the clone's data model)
- `organizations.md`, `users.md` — org/user shape (org = tenant, users = members)
- `pipes.md` — **Pipe** = a Kanban board/process. Queries/mutations for
  creating pipes, listing phases, start form.
- `phases.md`, `update-phase-settings.md`, `reorder-phase-fields.md`,
  `create-fields-in-a-phase.md`, `create-fields-in-phase.md` — **Phase** = a
  column in the Kanban board; phases have fields and settings (SLA, done state).
- `cards.md`, `create-a-card-with-the-required-fields-fulfilled.md`,
  `move-card-to-a-different-phase.md`, `move-a-card-to-a-different-phase.md`,
  `create-connected-cards.md`, `list-card-activities.md` — **Card** = the unit of
  work moving through phases; the clone's central object.
- `fields.md` — **Field** = form/card field type system (text, select, date,
  attachment, connector, etc.) — 483 lines, the richest single doc, defines the
  full field-type enum we need to replicate.
- `tables.md`, `table-records.md`, `list-records.md` — **Database Tables** =
  Pipefy's secondary structured-data feature (like an Airtable-lite alongside pipes).

### Forms, email, attachments, tasks
- `configure-a-start-form-on-existing-pipe.md`,
  `create-a-pipe-with-start-form-configured.md`,
  `create-pipe-with-start-form-configured.md` — the public/internal intake form
  that creates a card.
- `add-attachments-to-a-card-or-field.md` — file upload on a card (maps to our
  Postgres `bytea` storage plan).
- `create-and-send-an-email-through-a-card.md`, `list-emails-from-a-card.md` —
  card-level email thread (out of scope to actually send email; model the data only).
- `get-phase-task.md`, `tasks.md`, `create-task.md` — assignable sub-tasks on a card.

### Reports / analytics
- `pipe-reports.md`, `get-reports.md`, `get-pipe-reports.md`,
  `create-pipe-report.md`, `update-pipe-report.md`, `delete-pipe-report.md`,
  `get-pipe-report-columns.md`, `get-pipe-report-filterable-fields.md`,
  `summary-examples.md` — dashboards/summary aggregations over cards.
  Maps to our "Postgres aggregation query" backend plan.

### Search, tags, misc
- `search-cards.md` — cross-pipe filtered/paginated card search → Postgres full-text
  search equivalent.
- `add-tags-to-resource.md`, `tag-categories.md`, `tags-by-category.md`,
  `create-tag.md`, `create-tags-in-bulk.md`, `update-tag.md`, `tag.md`,
  `remove-tags-from-resource.md` — tagging system across resources.
- `get-resource-ids.md`, `pagination-basics.md`,
  `run-multiple-queries-or-mutations-in-a-single-request.md` — API conventions.
- `update-repo-preferences.md`, `pipe-flow-query.md` — pipe-level UI prefs and
  the phases+agents+automations combined view.
- `archive-field.md`, `unarchive-field.md`, `search-for-field-dependencies.md` —
  field lifecycle management.
- `importer.md`, `cards-importer.md`, `records-importer.md` — bulk xlsx import
  into a pipe or table.

### Errors & webhooks
- `how-to-handle-errors.md`, `status-and-error-handling.md`,
  `unauthorized-error.md`, `invalid-role-errors.md`,
  `field-type-not-found-error-resource-not-found.md`,
  `invalid-input-error-invalid-input.md`,
  `card-could-not-be-moved-to-phase-error.md` — error shape conventions.
- `organization-webhooks.md`, `pipe-table-webhooks.md` — webhook event model
  (maps to our "HTTP POST to registered URLs" backend plan).

## guides/
- `orchestrating-agents-with-pipefy.md` — how AI Agents attach to phases/pipes
  and orchestrate multi-step workflows. Informs the AI Agent entity shape (we
  model the entity + simple trigger execution, not a real LLM call — BYOLLM/
  multi-provider config is out of scope).

## Not fetched (deliberately out of scope per spec-inspect.md)
- SMTP configuration, custom roles/permissions, organization usage/billing stats,
  AI credit usage, favorite pipes, group management — all fall under
  auth/billing/settings, excluded by project scope.
- Changelog pages — historical, not needed for cloning current behavior.
- Non-TypeScript/Node SDK pages — none were present; API is GraphQL-only, no
  language-specific SDK pages to skip.

## Next steps
UI has not been touched yet. Next iteration: log into the Chrome session,
`read_page` the main dashboard, and build `sitemap.md` (spec-inspect.md
"Iteration 1: Site Map").
