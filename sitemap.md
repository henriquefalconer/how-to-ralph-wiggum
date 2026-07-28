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
| Início (Home) | `/organizations/:orgId` | Dashboard | Greeting header, "Meu trabalho / Templates / Ajuda / Estatísticas de uso" quick links, plan-usage banner, AI "create a pipe from a prompt" box, then tabbed **Pipes** / **Databases** grid of cards + "Criar pipe" / "Criar database" tiles. **Databases tab inspected iteration 4** — create flow, field-type palette, record CRUD, Configurações de database; see prd feature-005 and spec-build.md §12. **Pipes tab + "Criar pipe" flow inspected iteration 3 (this run's iteration 3)** — template-gallery modal → name-only "Criar pipe do zero" modal, auto-provisioned 3-phase starter template, server-assigned (non-name-derived) pipe color; see prd feature-001 and spec-build.md §16. |
| Portal | `/organizations/:orgId/interfaces/:interfaceId/pages/:pageId` | Public-ish employee service portal (built on the Interfaces feature) | Ships with a default sample template: hero banner, search bar, "Navegue por departamento" cards (IT Support / HR / Travel), "Escolha um formulário" section, "Políticas e documentos" section. Has an "Entrar" (sign in) button top-right — portal can apparently be viewed logged-out too. Out of scope to build as a separate auth surface; model as a page composed of pipe/database widgets. |
| Tarefas e Solicitações (Tasks & Requests) | `/organizations/:orgId/tasks_and_requests` | List view | Cross-pipe inbox. Columns: Tarefa, Pipe, Recebido em, Vencimento. "Abertas"/"Concluídas" toggle. Empty state: "Tudo em dia! Novas tarefas serão listadas aqui." **CONFIRMED iteration 9 to be a DIFFERENT underlying feed from Meu trabalho** — stayed empty even after a card was assigned to the current user with a past-due Vencimento (which DID populate Meu trabalho). The card's own "Atividades" tab (per-field audit log) is also NOT this — checked directly, it just lists field-change history (actor/field/old→new/timestamp), unrelated to "Tarefas". This page's actual data source (approval tasks? a request-specific sub-object?) is still unconfirmed — flagged for a future iteration if time allows, low priority since it appeared structurally minor next to Meu trabalho. |
| Interfaces | `/organizations/:orgId/interfaces` | Builder / list | "Drag and drop pipe/database data to build pages" — a no-code internal-tool/page builder. Empty state has a single "Criar interface" CTA. The Portal above is itself one Interfaces page. **Deep-dived iteration 6** — creation modal (name/icon/3-tier privacy), drag-only element palette (Dados live-query table w/ viewer-scoped dynamic visibility conditions; Formulários start-form launcher), autosave, multi-page support, Compartilhar sharing modal, and a newly-discovered per-page floating AI Assistant chat widget. **Remaining elements + sharing deep-dived iteration 8** — Texto/Link/Divisor/Imagem/Vídeo/Incorporar/Documento, and Compartilhar's Gerenciar pessoas tab. See prd feature-008/feature-020/feature-023/feature-024/feature-025/feature-026, spec-build.md §19/§21. |
| Learning Center | `/organizations/:orgId/learning_center` | Help/marketing hub | Tabs: Processos prontos, Agentes de IA, Cursos e artigos, Histórias de sucesso; sidebar "Links rápidos" (Guia de primeiros passos, Tutoriais, Academy, Comunidade, Central de Ajuda) and "Novidades" feed. **Out of scope** — pure help/marketing content, not a product feature to clone. |
| Meu trabalho (My work) | `/my-tasks` (redirects to `/my-work`) | List view | Linked from the Início quick-links row. **Deep-dived iteration 9** — cross-pipe view of cards ASSIGNED to the current user (not the same feed as Tarefas e Solicitações above), 6 filter tabs with live counts (Todos os cards / Cards prestes a vencer [due ≤7d] / Vencidos [due date passed] / Atrasados [phase-SLA expiry, independent of due date] / Expirados / Concluídos), 6-column sortable table. Confirmed it drives the notification bell (an overdue card auto-generates an in-app notification). See prd feature-027, spec-build.md §22. |
| Notificações | bell icon (top nav) + `/notifications` | Popover + full list page | **Deep-dived iteration 9** — real-time in-app notifications (confirmed: assigning+overdue-dating a card auto-generated "O card X está vencido" within the same session, no manual trigger). Popover has "Marcar todas como lidas"; full page has one icon-per-notification-type. Unread red badge on the bell clears automatically after visiting either surface. See prd feature-027. |
| Estatísticas de uso (Usage stats) | `/organizations/:orgId/admin-panel/usage` | Settings/billing-adjacent | Plan usage / limits. **Out of scope** (billing). |
| Upgrade button | external pricing page | N/A | **Out of scope** (billing). |

Account-menu (avatar, top-right, labelled "Conta e recursos") **attempted iteration 9** —
clicking it 3 times never produced a visible dropdown in a screenshot; not pursued further
since account/profile management is explicitly out of scope. The clone should render the
button as an inert stub.

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
| Kanban | (root) | Kanban board | **Core view. Inspected iteration 3** — phase columns (here: Caixa de entrada / Fazendo / Concluído — Pipefy's default 3-phase template), card counts per column (client-side staleness quirk on same-session move, see spec-build.md §11), "Criar novo card" (gated on start form having ≥1 field) / "Nova fase" buttons, drag-drop cards between columns, done-phase card styling. Card detail opens at `/open-cards/:cardId` (see prd feature-004, spec-build.md §11). |
| Lista | `/list` (approx) | Configurable table view | Column-based list of cards; starts with "Nenhuma coluna selecionada — habilite as colunas" empty state; has its own "Criar novo card". |
| Relatórios | `/reports_v2` | Reports builder | **Inspected iteration 6** — grouped field filter/column picker (shared with Automations token picker), live-query results table, saved report tiles with live count badges. See prd feature-011, spec-build.md §14. |
| Formulário | (interfaces path) | Start-form editor | "Vamos começar adicionando alguns campos" + "Adicionar campos" CTA; side panel shows solicitation count, and "Próximos passos" tips (enable request tracking, create standardized emails, analyze reports). |
| Emails | (own path) | Shared team inbox | **Inspected iteration 4** — card-scoped compose only (no freeform compose), per-thread generated outbound alias distinct from the pipe's inbound-routing alias, reusable email templates sharing the 'Conteúdo dinâmico' token picker with Automations/Reports. See prd feature-018, spec-build.md §17. |
| Painéis | `/dashboards` | Analytics dashboards | **Inspected iteration 6** — named dashboards of drag-resizable chart widgets, 8 viz types, live-recomputed aggregation metrics. See prd feature-012, spec-build.md §14. |
| Learning Center | (org-level, pipe-scoped entry point) | Same help hub as org-level — out of scope |

"Gerenciar" dropdown (pipe settings — the phase/field editors that matter most for cloning):

| Item | Purpose |
|---|---|
| Formulário inicial | Start form field editor (same as Formulário tab) |
| Fases | **Phase editor** (`/pipes/:id/settings/phases[/:phaseId]`) — phase switcher + field-type palette + live form builder + 'Condicionais em campos' (field conditional rules, see prd feature-009) + 'Opções Avançadas' (per-phase name/color/description, done flag, allow-card-creation, task email collection, auto-assign, SLA alert, delete). **Inspected iteration 2** — see prd feature-002/003/009 and `screenshots/inspect/phases-editor.jpg`. |
| Pessoas | Pipe members/roles. **Inspected iteration 2** — member list + 4-tier role picker (Membro do pipe / Admin do Pipe / Somente leitura / Visão restrita, 3 of 4 upgrade-gated in this trial org — clone should not gate them). See prd feature-013. |
| Email | Pipe email settings (redundant with Emails tab's "Configurações"). **Inspected iteration 4** — 5 cards: inbound-alias toggle + Opções avançadas, Templates de email (Meus templates / Template de email padrão), Envie emails via Pipefy (custom SMTP), Automação de email (external link into feature-010), Receber emails e solicitações (same concept as the inbound toggle). See prd feature-018, spec-build.md §17. |
| Configurações do pipe | General pipe settings. **Inspected iteration 2** — icon/name/tags, item naming, default view, "Título do card" field picker (drives `card.title` — corrects the iteration-3 "first field" assumption, see spec-build.md Card section), Kanban/connected-card field pickers, pipe-wide expiration alert, visibility, AI-tool toggles, edit-permission toggles, clone/delete pipe. See prd feature-014. |
| Atividades | Activity/audit log for the pipe. **Inspected iteration 2** — 2-tab log (Atividade de cards / Alterações de configuração), searchable by author, exportable, live (no reload needed). See prd feature-015. |
| Ferramentas | Tool panel: Apps (marketplace, out of scope) / Conexões / Etiquetas / Gerador de PDF. **Etiquetas inspected iteration 2** — created a real label, name+hex-color model confirmed (prd feature-016). **Conexões + Gerador de PDF inspected iteration 7** — created a real Conexão (pipe/database link with permission/cardinality/phase-gating options, surfaces as a card-level tab) and a real PDF template (rich-text + dynamic-field tokens, rendered per-card into a downloadable PDF). See prd feature-021/feature-022, spec-build.md §20. |
| Lixeira (beta) | Deleted-cards trash/restore. **Inspected iteration 2** — 15-day retention, single Cards tab, empty state confirmed; restore flow not exercised (would require deleting the pipe's only test card). See prd feature-017. |

AI Agents sub-tabs (`/pipes/:id/ai_agents`): Agentes de IA, Logs, Templates, MCP (new).
**Inspected iteration 5** — 3-step builder (Geral/Conhecimento/Comportamentos), behaviors
reuse Automations' 9 trigger types + the same grouped token-picker component (4th confirmed
reuse), per-behavior model/skills/effort pickers, agent creation persists a server-side draft
immediately (not client-only-until-save). Logs/Templates/MCP sub-tabs surveyed. See prd
feature-019 and spec-build.md §18. Per project rules, modeled as data + simple rule evaluator
only, no real multi-LLM orchestration.

Automations sub-tabs (`/pipes/:id/automations`): Automações, Logs. **Inspected iteration 5**
— full trigger→action rule builder (10 triggers × 12 actions), built and fired a real rule,
confirmed via Logs and the card detail view. See prd feature-010 and spec-build.md §13.

## Not yet inspected (next iterations)
- Lixeira restore flow (currently empty; needs a disposable throwaway card to test)
- Tarefas e Solicitações's actual data source — confirmed NOT the same feed as Meu trabalho
  and NOT a card's Atividades log; still unconfirmed what populates it (low priority)
