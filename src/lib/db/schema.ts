import {
  boolean,
  integer,
  jsonb,
  pgTable,
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
