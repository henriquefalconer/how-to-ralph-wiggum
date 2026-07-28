# Pipefy — Product Overview (from marketing llms.txt)

Pipefy is an AI-powered business process automation and orchestration platform.
Teams design, automate, and manage workflows ("pipes") using a no-code Kanban-style
interface, AI Agents, and native integrations.

Core platform layers:
- **Human Interface** — forms, portals, Kanban board for service delivery
- **Workflow and Rules engine** — phases, automations, conditional logic
- **Data and Analytics** — reports, dashboards, real-time insights
- **Automation and Integration engine** — triggers/actions, 300+ connectors, AI Agents

Differentiator: **Pipefy Agent Studio** — lets non-developers build/deploy AI Agents,
including Bring-Your-Own-LLM (BYOLLM). Out of scope for our clone (LLM provider
integration, per project rules we don't add unrelated third-party auth), but we
should still model AI Agents as a first-class entity type since it's central to
the product's data model (pipes have agents attached to phases).

Pricing tiers exist (Starter/Business/Enterprise/Unlimited) — **out of scope**
per project rules (no billing/paywalls).

## What we are cloning
Per this project's scope (no auth/billing/settings/OAuth), the clone targets the
**core workflow product**: organizations → pipes (Kanban boards) → phases →
cards → fields, plus database tables, reports/analytics, tags, tasks, and the
GraphQL-shaped API surface that powers them. AI Agents/Automations are modeled
as data entities and simple rule execution (not a real LLM orchestration engine).

Full marketing llms.txt saved at the raw source: https://www.pipefy.com/llms.txt
(not re-saved verbatim here — the summary above captures everything relevant to
building the clone; solutions-by-department/industry pages and pricing are
out of scope for the PRD).
