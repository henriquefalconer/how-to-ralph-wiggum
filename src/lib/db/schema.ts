import {
  boolean,
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
