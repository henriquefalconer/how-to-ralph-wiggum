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
