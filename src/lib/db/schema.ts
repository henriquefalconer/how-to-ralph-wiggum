import type {
  ConditionGroup,
  ConditionalAction,
} from "@/lib/field-conditional-types";
import type { ReportFilterGroup } from "@/lib/report-types";
import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  // The single implicit "logged-in" identity for this org (auth is out of
  // scope per project rules — see CLAUDE.md's Out of Scope section).
  isSelf: boolean("is_self").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pipeMemberRoles = [
  "pipe_member",
  "pipe_admin",
  "read_only",
  "restricted_view",
] as const;

export const pipeMembers = pgTable("pipe_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  pipeId: uuid("pipe_id")
    .notNull()
    .references(() => pipes.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role", { enum: pipeMemberRoles })
    .notNull()
    .default("pipe_member"),
  invitedAt: timestamp("invited_at").defaultNow().notNull(),
  joinedAt: timestamp("joined_at"),
});

export const pipeDefaultViews = ["kanban", "list"] as const;
export const pipeExpirationAlertUnits = ["minutes", "hours", "days"] as const;
export const pipeVisibilities = ["org_open", "invite_only"] as const;

export const pipes = pgTable("pipes", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull(),
  // References fields.id within the (owner_type='start_form', owner_id=pipes.id) scope.
  // Not a DB-level FK (fields has a composite PK keyed by scope, not a surrogate id).
  titleFieldId: text("title_field_id"),
  icon: text("icon"),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  // null means "use the dictionary's localized default" rather than a stored override.
  itemName: text("item_name"),
  createCardButtonLabel: text("create_card_button_label"),
  defaultView: text("default_view", { enum: pipeDefaultViews })
    .notNull()
    .default("kanban"),
  kanbanPreviewFieldIds: jsonb("kanban_preview_field_ids")
    .$type<string[]>()
    .notNull()
    .default([]),
  connectedCardFieldIds: jsonb("connected_card_field_ids")
    .$type<string[]>()
    .notNull()
    .default(["created_at", "current_phase"]),
  expirationAlertTime: integer("expiration_alert_time").notNull().default(0),
  expirationAlertUnit: text("expiration_alert_unit", {
    enum: pipeExpirationAlertUnits,
  })
    .notNull()
    .default("minutes"),
  expirationAlertBusinessDaysOnly: boolean(
    "expiration_alert_business_days_only",
  )
    .notNull()
    .default(false),
  visibility: text("visibility", { enum: pipeVisibilities })
    .notNull()
    .default("org_open"),
  aiAgentsEnabled: boolean("ai_agents_enabled").notNull().default(true),
  aiCopilotEnabled: boolean("ai_copilot_enabled").notNull().default(true),
  allowBulkActions: boolean("allow_bulk_actions").notNull().default(false),
  restrictEditToAssignee: boolean("restrict_edit_to_assignee")
    .notNull()
    .default(false),
  restrictDeleteToAdmin: boolean("restrict_delete_to_admin")
    .notNull()
    .default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const phases = pgTable("phases", {
  id: uuid("id").primaryKey().defaultRandom(),
  pipeId: uuid("pipe_id")
    .notNull()
    .references(() => pipes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  done: boolean("done").notNull().default(false),
  position: integer("position").notNull(),
  color: text("color").notNull().default("#2E68D9"),
  description: text("description"),
  allowCardCreation: boolean("allow_card_creation").notNull().default(false),
  collectTaskEmails: boolean("collect_task_emails").notNull().default(false),
  autoAssignUserIds: jsonb("auto_assign_user_ids")
    .$type<string[]>()
    .notNull()
    .default([]),
  slaTime: integer("sla_time"),
  slaUnit: text("sla_unit", { enum: ["hours", "days"] }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const labels = pgTable("labels", {
  id: uuid("id").primaryKey().defaultRandom(),
  pipeId: uuid("pipe_id")
    .notNull()
    .references(() => pipes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull(),
});

export const fieldOwnerTypes = ["phase", "start_form", "table"] as const;

export const fieldTypes = [
  "assignee_select",
  "attachment",
  "checklist_horizontal",
  "checklist_vertical",
  "cnpj",
  "connector",
  "cpf",
  "currency",
  "date",
  "datetime",
  "due_date",
  "email",
  "id",
  "label_select",
  "long_text",
  "number",
  "phone",
  "radio_horizontal",
  "radio_vertical",
  "select",
  "short_text",
  "statement",
  "time",
] as const;

export const fields = pgTable(
  "fields",
  {
    // The slug id (e.g. "long_text_fi_ld"), unique per (ownerType, ownerId) scope — not globally.
    id: text("id").notNull(),
    ownerType: text("owner_type", { enum: fieldOwnerTypes }).notNull(),
    ownerId: uuid("owner_id").notNull(),
    label: text("label").notNull(),
    type: text("type", { enum: fieldTypes }).notNull(),
    required: boolean("required").notNull().default(false),
    help: text("help"),
    description: text("description"),
    editable: boolean("editable").notNull().default(true),
    minimalView: boolean("minimal_view").notNull().default(false),
    options: jsonb("options").$type<string[]>().notNull().default([]),
    connectorTargetId: uuid("connector_target_id"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.ownerType, table.ownerId, table.id] }),
  ],
);

export const fieldConditionals = pgTable("field_conditionals", {
  id: uuid("id").primaryKey().defaultRandom(),
  phaseId: uuid("phase_id")
    .notNull()
    .references(() => phases.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  // Determines both display order and evaluation/conflict order — rules are
  // processed top-to-bottom and the last one to touch a given field wins.
  position: integer("position").notNull().default(0),
  conditionGroups: jsonb("condition_groups")
    .$type<ConditionGroup[]>()
    .notNull()
    .default([]),
  trueActions: jsonb("true_actions")
    .$type<ConditionalAction[]>()
    .notNull()
    .default([]),
  falseActions: jsonb("false_actions")
    .$type<ConditionalAction[]>()
    .notNull()
    .default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cards = pgTable("cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  pipeId: uuid("pipe_id")
    .notNull()
    .references(() => pipes.id, { onDelete: "cascade" }),
  phaseId: uuid("phase_id")
    .notNull()
    .references(() => phases.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  done: boolean("done").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cardFieldValues = pgTable(
  "card_field_values",
  {
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    // Together with fieldId these mirror fields' composite scope key
    // (owner_type='start_form', owner_id=pipe.id) or (owner_type='phase', owner_id=phase.id).
    fieldOwnerType: text("field_owner_type", {
      enum: fieldOwnerTypes,
    }).notNull(),
    fieldOwnerId: uuid("field_owner_id").notNull(),
    fieldId: text("field_id").notNull(),
    value: text("value").notNull().default(""),
    filledAt: timestamp("filled_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({
      columns: [
        table.cardId,
        table.fieldOwnerType,
        table.fieldOwnerId,
        table.fieldId,
      ],
    }),
  ],
);

export const tables = pgTable("tables", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  public: boolean("public").notNull().default(true),
  // References fields.id within the (owner_type='table', owner_id=tables.id) scope.
  titleFieldId: text("title_field_id"),
  subtitleTemplate: text("subtitle_template").notNull().default("Criado em"),
  createButtonLabel: text("create_button_label")
    .notNull()
    .default("Criar registro"),
  allMembersCanCrud: boolean("all_members_can_crud").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tableRecords = pgTable("table_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  tableId: uuid("table_id")
    .notNull()
    .references(() => tables.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tableRecordFieldValues = pgTable(
  "table_record_field_values",
  {
    recordId: uuid("record_id")
      .notNull()
      .references(() => tableRecords.id, { onDelete: "cascade" }),
    // Scoped to (owner_type='table', owner_id=tables.id) — implicit via the
    // record's tableId, so no separate fieldOwnerType/fieldOwnerId columns
    // are needed here (unlike card_field_values, which spans two scopes).
    fieldId: text("field_id").notNull(),
    value: text("value").notNull().default(""),
    dateValue: timestamp("date_value", { mode: "date" }),
    datetimeValue: timestamp("datetime_value"),
    floatValue: doublePrecision("float_value"),
    filledAt: timestamp("filled_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.recordId, table.fieldId] })],
);

export const cardTransitions = pgTable("card_transitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  cardId: uuid("card_id")
    .notNull()
    .references(() => cards.id, { onDelete: "cascade" }),
  fromPhaseId: uuid("from_phase_id").references(() => phases.id, {
    onDelete: "set null",
  }),
  toPhaseId: uuid("to_phase_id")
    .notNull()
    .references(() => phases.id, { onDelete: "cascade" }),
  movedAt: timestamp("moved_at").defaultNow().notNull(),
});

export const webhookScopeTypes = ["org", "pipe", "table"] as const;

export const webhooks = pgTable("webhooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  scopeType: text("scope_type", { enum: webhookScopeTypes }).notNull(),
  // Not a DB-level FK: scopeId points into whichever of
  // organizations/pipes/tables scopeType selects.
  scopeId: uuid("scope_id").notNull(),
  url: text("url").notNull(),
  events: jsonb("events").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  webhookId: uuid("webhook_id")
    .notNull()
    .references(() => webhooks.id, { onDelete: "cascade" }),
  event: text("event").notNull(),
  payload: jsonb("payload").notNull(),
  success: boolean("success").notNull(),
  statusCode: integer("status_code"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const automationTriggerTypes = [
  "card_entered_phase",
  "field_updated",
  "card_created",
  "recurring_activity",
  "alert_triggered",
  "card_exited_phase",
  "email_received",
  "connected_cards_moved_to_phase",
  "http_response_received",
  "interface_button_clicked",
] as const;

export const automationActionTypes = [
  "ask_ai",
  "send_task",
  "move_card",
  "update_field",
  "create_connected_record",
  "create_record",
  "move_parent_card",
  "distribute_assignees",
  "apply_formula",
  "http_request",
  "apply_sla_rules",
  "send_email_template",
] as const;

export const automationRunStatuses = ["success", "error"] as const;

export const automations = pgTable("automations", {
  id: uuid("id").primaryKey().defaultRandom(),
  pipeId: uuid("pipe_id")
    .notNull()
    .references(() => pipes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  triggerType: text("trigger_type", {
    enum: automationTriggerTypes,
  }).notNull(),
  triggerConfig: jsonb("trigger_config")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  actionType: text("action_type", { enum: automationActionTypes }).notNull(),
  actionConfig: jsonb("action_config")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const automationRuns = pgTable("automation_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  automationId: uuid("automation_id")
    .notNull()
    .references(() => automations.id, { onDelete: "cascade" }),
  cardId: uuid("card_id")
    .notNull()
    .references(() => cards.id, { onDelete: "cascade" }),
  cardTitle: text("card_title").notNull(),
  status: text("status", { enum: automationRunStatuses }).notNull(),
  message: text("message").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
});

export const interfacePrivacyTiers = [
  "restricted_people",
  "restricted_org",
  "public_link",
] as const;

export const interfaces = pgTable("interfaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("Layout"),
  privacyTier: text("privacy_tier", { enum: interfacePrivacyTiers })
    .notNull()
    .default("restricted_org"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const interfacePages = pgTable("interface_pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  interfaceId: uuid("interface_id")
    .notNull()
    .references(() => interfaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  showHeader: boolean("show_header").notNull().default(true),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const interfaceElementTypes = [
  "data_table",
  "form_link",
  "document",
  "text",
  "link",
  "divider",
  "image",
  "video",
  "embed",
] as const;

export const interfacePageElements = pgTable("interface_page_elements", {
  id: uuid("id").primaryKey().defaultRandom(),
  pageId: uuid("page_id")
    .notNull()
    .references(() => interfacePages.id, { onDelete: "cascade" }),
  type: text("type", { enum: interfaceElementTypes }).notNull(),
  position: integer("position").notNull().default(0),
  config: jsonb("config")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const interfaceSharedWithTypes = ["person", "group"] as const;

export const interfaceShares = pgTable(
  "interface_shares",
  {
    interfaceId: uuid("interface_id")
      .notNull()
      .references(() => interfaces.id, { onDelete: "cascade" }),
    sharedWithType: text("shared_with_type", {
      enum: interfaceSharedWithTypes,
    }).notNull(),
    sharedWithId: text("shared_with_id").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.interfaceId, table.sharedWithType, table.sharedWithId],
    }),
  ],
);

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  pipeId: uuid("pipe_id")
    .notNull()
    .references(() => pipes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  // Array of AND-groups; a group is an array of {fieldId, operator, value}
  // checks. OR across groups, same shape as field_conditionals' condition
  // groups. Re-evaluated against live card data every time the report is
  // opened — never a frozen snapshot.
  filters: jsonb("filters").$type<ReportFilterGroup[]>().notNull().default([]),
  visibleColumnFieldIds: jsonb("visible_column_field_ids")
    .$type<string[]>()
    .notNull()
    .default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const auditLogCategories = ["card_activity", "config_change"] as const;

export const auditLogResourceTypes = [
  "card",
  "automation",
  "pipe",
  "field",
  "phase",
  "table",
] as const;

export const auditLogEntries = pgTable("audit_log_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  pipeId: uuid("pipe_id")
    .notNull()
    .references(() => pipes.id, { onDelete: "cascade" }),
  // Nullable so removing a member never erases the history of what they did.
  actorUserId: uuid("actor_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  // Denormalised copy of the actor at write time — the log must still render
  // (and stay searchable by author) after the user row is gone.
  actorName: text("actor_name").notNull(),
  actorEmail: text("actor_email").notNull(),
  category: text("category", { enum: auditLogCategories }).notNull(),
  resourceType: text("resource_type", {
    enum: auditLogResourceTypes,
  }).notNull(),
  // The sentence is stored twice on purpose: `message` is the canonical
  // server-rendered sentence the REST API and CSV export serve, while
  // messageKey + messageParams let the dashboard re-render it in the reader's
  // locale (every page is internationalised — see CLAUDE.md).
  message: text("message").notNull(),
  messageKey: text("message_key").notNull(),
  messageParams: jsonb("message_params")
    .$type<Record<string, string>>()
    .notNull()
    .default({}),
  occurredAt: timestamp("occurred_at").defaultNow().notNull(),
});

export const dashboardChartMetrics = [
  "cards_total",
  "attachments_total",
  "comments_total",
  "lead_time_min",
  "lead_time_sum",
  "lead_time_max",
  "lead_time_avg",
  "assignees_total",
] as const;

export const dashboardChartTimeGroupings = [
  "day",
  "week",
  "month",
  "none",
] as const;

export const dashboardChartVizTypes = [
  "area",
  "bar",
  "calendar",
  "line",
  "number",
  "pie",
  "scatter",
  "table",
] as const;

export const dashboards = pgTable("dashboards", {
  id: uuid("id").primaryKey().defaultRandom(),
  pipeId: uuid("pipe_id")
    .notNull()
    .references(() => pipes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  defaultTimeRange: text("default_time_range").notNull().default("all_time"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dashboardCharts = pgTable("dashboard_charts", {
  id: uuid("id").primaryKey().defaultRandom(),
  dashboardId: uuid("dashboard_id")
    .notNull()
    .references(() => dashboards.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  metric: text("metric", { enum: dashboardChartMetrics }).notNull(),
  // References a fields.id (any pipe field) or a CARD_ATTRIBUTE_FIELD_IDS
  // underscore-prefixed id (e.g. "_currentPhase") — same dual addressing
  // scheme report-types.ts uses for report filters/columns.
  dimensionFieldId: text("dimension_field_id"),
  // "_createdAt" or "_updatedAt" — the same underscore-prefixed card
  // attribute ids as above, restricted here to timestamp-bearing ones.
  timeFieldId: text("time_field_id").notNull().default("_createdAt"),
  timeRange: text("time_range").notNull().default("all_time"),
  timeGrouping: text("time_grouping", { enum: dashboardChartTimeGroupings }),
  vizType: text("viz_type", { enum: dashboardChartVizTypes }).notNull(),
  filters: jsonb("filters").$type<ReportFilterGroup[]>().notNull().default([]),
  position: jsonb("position")
    .$type<{ x: number; y: number; w: number; h: number }>()
    .notNull()
    .default({ x: 0, y: 0, w: 4, h: 3 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
