# Pipefy Site Map

Captured 2026-07-28, iteration 1, from a live trial org (`app.pipefy.com/organizations/302526402`)
that started with **zero pipes**. Creating a test pipe ("Purchase Requests", id `307273712`)
was required to get past a mandatory onboarding modal — see "Empty-org gotcha" below.

Layout pattern: **top nav bar** (org-level or pipe-level, changes per context) + a
**horizontal tab strip** immediately below it for the current object's sub-pages.
No left sidebar in this org (Pipefy has historically also shipped a sidebar-nav
version — the account seen here uses the newer top-tab nav). Content area fills
the rest of the viewport.

## Empty-org gotcha (important for QA/demo-data setup later)
Visiting the org root while it has 0 pipes forces a full-screen "Comece com um
template" modal (template gallery + "Criar pipe do zero" + "Criar com IA") with
**no close/X button** — confirmed via DOM inspection, nothing dismisses it short
of creating a pipe. Once ≥1 pipe exists, the org root instead renders the normal
"Início" dashboard. The clone should NOT reproduce this forced-modal quirk —
it's a growth-onboarding dark pattern, not core functionality; the clone's empty
state should just show an empty dashboard with a "Create pipe" CTA.

## Org-level pages (top nav when not inside a pipe)

| Nav label | URL | Page type | Notes |
|---|---|---|---|
| Início (Home) | `/organizations/:orgId` | Dashboard | Greeting header, "Meu trabalho / Templates / Ajuda / Estatísticas de uso" quick links, plan-usage banner, AI "create a pipe from a prompt" box, then tabbed **Pipes** / **Databases** grid of cards + "Criar pipe" / "Criar database" tiles |
| Portal | `/organizations/:orgId/interfaces/:interfaceId/pages/:pageId` | Public-ish employee service portal (built on the Interfaces feature) | Ships with a default sample template: hero banner, search bar, "Navegue por departamento" cards (IT Support / HR / Travel), "Escolha um formulário" section, "Políticas e documentos" section. Has an "Entrar" (sign in) button top-right — portal can apparently be viewed logged-out too. Out of scope to build as a separate auth surface; model as a page composed of pipe/database widgets. |
| Tarefas e Solicitações (Tasks & Requests) | `/organizations/:orgId/tasks_and_requests` | List view | Cross-pipe inbox of assigned Tasks. Columns: Tarefa, Pipe, Recebido em, Vencimento. "Abertas"/"Concluídas" toggle. Empty state: "Tudo em dia! Novas tarefas serão listadas aqui." |
| Interfaces | `/organizations/:orgId/interfaces` | Builder / list | "Drag and drop pipe/database data to build pages" — a no-code internal-tool/page builder. Empty state has a single "Criar interface" CTA. The Portal above is itself one Interfaces page. |
| Learning Center | `/organizations/:orgId/learning_center` | Help/marketing hub | Tabs: Processos prontos, Agentes de IA, Cursos e artigos, Histórias de sucesso; sidebar "Links rápidos" (Guia de primeiros passos, Tutoriais, Academy, Comunidade, Central de Ajuda) and "Novidades" feed. **Out of scope** — pure help/marketing content, not a product feature to clone. |
| Meu trabalho (My work) | `/my-tasks` | List view | Linked from the Início quick-links row; likely same underlying data as Tarefas e Solicitações scoped to "assigned to me" — not yet opened, verify next pass. |
| Estatísticas de uso (Usage stats) | `/organizations/:orgId/admin-panel/usage` | Settings/billing-adjacent | Plan usage / limits. **Out of scope** (billing). |
| Upgrade button | external pricing page | N/A | **Out of scope** (billing). |

Account-menu (avatar, top-right) and notification bell not yet opened — defer to
a settings-focused pass, low priority since auth/account settings are out of scope.

## Pipe-level pages (top nav + tab strip once inside a pipe, e.g. `/pipes/307273712`)

Top tab strip (pipe-scoped, sits above the page tabs):

| Tab | Purpose |
|---|---|
| Pipe | Returns to the pipe's own page tabs (default) |
| Agentes de IA | AI Agents feature — see below |
| Automações | Automation rules — see below |
| Integrações | Promo modal for 500+ external connectors (SAP, Slack, Teams, Salesforce...) gated behind "fale com seu gerente de conta" — **treat as out of scope / non-buildable**, but its trigger→action canvas preview confirms the automation data shape (trigger card event → action) |
| Conexões (dropdown) | Attach a Database Table to this pipe so its fields can use `connector`-type fields. Empty state: "Ainda não há databases conectados" + "Gerenciar conexões" link |
| Compartilhar formulário | Share the pipe's public start form (link/embed) |
| Gerenciar (dropdown) | Pipe settings menu — see below |

Page tabs (`/pipes/:id`, `/pipes/:id/flow`, etc.):

| Tab | URL suffix | Page type | Notes |
|---|---|---|---|
| Mapa | (none, default view toggle) | Visual node map | Shows this pipe (and any connected pipes/databases) as boxes on a canvas; "Profundidade de camadas" + "Elementos (N)" controls. Read-only overview. |
| Fluxo | `/flow` | Visual pipeline builder | Each phase rendered as a column card with quick-add shortcuts: "Adicionar agente de IA", "Adicionar automação", "Atribuir membros", "Adicionar campos". This is the phase/field editor entry point, alternate to Kanban. |
| Kanban | (root) | Kanban board | **Core view.** Phase columns (here: Caixa de entrada / Fazendo / Concluído — Pipefy's default 3-phase template), card counts per column, "Criar novo card" / "Nova fase" buttons, drag-drop cards between columns (per existing prd feature-004). |
| Lista | `/list` (approx) | Configurable table view | Column-based list of cards; starts with "Nenhuma coluna selecionada — habilite as colunas" empty state; has its own "Criar novo card". |
| Relatórios | `/reports_v2` | Reports builder | "Crie relatórios rápidos e exportáveis com informações de seus cards"; empty state prompts to build first report. Maps to prd's Report entity. |
| Formulário | (interfaces path) | Start-form editor | "Vamos começar adicionando alguns campos" + "Adicionar campos" CTA; side panel shows solicitation count, and "Próximos passos" tips (enable request tracking, create standardized emails, analyze reports). |
| Emails | (own path) | Shared team inbox | Left rail: Compor email, Todas as mensagens, Mensagens não lidas, Atribuídas a mim, Sem responsável, then Automações de email / Templates de email / Configurações; a per-pipe forwarding address (`pipe307273712@...`, currently disabled) for routing inbound email into the pipe. |
| Painéis | `/dashboards` | Analytics dashboards | "Explorar dados" + "Meus Painéis" / "Criar painel"; empty state "Nenhum painel criado". Distinct from Relatórios (dashboards = charts, relatórios = tabular exports). |
| Learning Center | (org-level, pipe-scoped entry point) | Same help hub as org-level — out of scope |

"Gerenciar" dropdown (pipe settings — the phase/field editors that matter most for cloning):

| Item | Purpose |
|---|---|
| Formulário inicial | Start form field editor (same as Formulário tab) |
| Fases | **Phase editor** (`/pipes/:id/settings/phases[/:phaseId]`) — phase switcher + field-type palette + live form builder + 'Condicionais em campos' (field conditional rules, see prd feature-009) + 'Opções Avançadas' (per-phase name/color/description, done flag, allow-card-creation, task email collection, auto-assign, SLA alert, delete). **Inspected iteration 2** — see prd feature-002/003/009 and `screenshots/inspect/phases-editor.jpg`. |
| Pessoas | Pipe members/roles — **borderline out of scope** (auth-adjacent), but member references are needed for `assignee_select` fields, so model minimally |
| Email | Pipe email settings (redundant with Emails tab's "Configurações") |
| Configurações do pipe | General pipe settings (name, color, description, icon) |
| Atividades (new) | Activity/audit log for the pipe |
| Ferramentas | Not yet opened |
| Lixeira (beta) | Deleted-cards trash/restore |

AI Agents sub-tabs (`/pipes/:id/ai_agents`): Agentes de IA, Logs, Templates, MCP (new).
Empty state: "Vamos criar seu primeiro agente!" — agents "seguem instruções, aprendem
com documentos, e executam tarefas". Per project rules, modeled as data + simple rule
evaluator only, no real multi-LLM orchestration.

Automations sub-tabs (`/pipes/:id/automations`): Automações, Logs. Trigger→action rule
builder, matches prd feature-007's webhook/automation model.

## Not yet inspected (next iterations)
- Card detail view (need to create at least one card first)
- Database Table creation + grid view + record detail
- Kanban drag-and-drop card move (behavioral test)
- Relatórios / Painéis actually building a chart
- Emails compose flow
- Automations rule builder (create one rule)
- AI Agents agent creation flow
- Pessoas / Configurações do pipe / Atividades / Ferramentas / Lixeira
- `/my-tasks` (org-level "my work" list) — confirm relation to Tarefas e Solicitações
- Account/notification menus (low priority, auth-adjacent)
