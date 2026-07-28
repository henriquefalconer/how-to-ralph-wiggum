import { db } from "@/lib/db";
import {
  fields,
  tableRecordFieldValues,
  tableRecords,
  tables,
} from "@/lib/db/schema";
import type { Field } from "@/lib/fields";
import { listFields } from "@/lib/fields";
import { triggerWebhookEvent } from "@/lib/webhooks";
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";

export type Table = typeof tables.$inferSelect;
export type TableRecord = typeof tableRecords.$inferSelect;

export interface TableSummary extends Table {
  recordsCount: number;
}

export async function listTables(orgId: string): Promise<TableSummary[]> {
  const rows = await db
    .select()
    .from(tables)
    .where(eq(tables.orgId, orgId))
    .orderBy(asc(tables.createdAt));

  const counts = await Promise.all(
    rows.map(async (t) => {
      const [{ value }] = await db
        .select({ value: count() })
        .from(tableRecords)
        .where(eq(tableRecords.tableId, t.id));
      return value;
    }),
  );

  return rows.map((t, index) => ({ ...t, recordsCount: counts[index] }));
}

export async function createTable(orgId: string, name: string): Promise<Table> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Table name is required");
  }

  const [table] = await db
    .insert(tables)
    .values({ orgId, name: trimmed })
    .returning();
  return table;
}

export async function getTable(tableId: string): Promise<Table | null> {
  const [table] = await db.select().from(tables).where(eq(tables.id, tableId));
  return table ?? null;
}

export interface TableSettingsInput {
  name?: string;
  titleFieldId?: string | null;
  subtitleTemplate?: string;
  createButtonLabel?: string;
  public?: boolean;
  allMembersCanCrud?: boolean;
}

export async function updateTableSettings(
  tableId: string,
  input: TableSettingsInput,
): Promise<Table> {
  const existing = await getTable(tableId);
  if (!existing) {
    throw new Error("Table not found");
  }
  if (input.name !== undefined && !input.name.trim()) {
    throw new Error("Table name is required");
  }

  const [updated] = await db
    .update(tables)
    .set({
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.titleFieldId !== undefined
        ? { titleFieldId: input.titleFieldId }
        : {}),
      ...(input.subtitleTemplate !== undefined
        ? { subtitleTemplate: input.subtitleTemplate }
        : {}),
      ...(input.createButtonLabel !== undefined
        ? { createButtonLabel: input.createButtonLabel }
        : {}),
      ...(input.public !== undefined ? { public: input.public } : {}),
      ...(input.allMembersCanCrud !== undefined
        ? { allMembersCanCrud: input.allMembersCanCrud }
        : {}),
    })
    .where(eq(tables.id, tableId))
    .returning();

  return updated;
}

export async function deleteTable(tableId: string): Promise<void> {
  const remaining = await db
    .delete(tables)
    .where(eq(tables.id, tableId))
    .returning({ id: tables.id });
  if (remaining.length === 0) {
    throw new Error("Table not found");
  }

  // `fields` is a polymorphic table (no DB-level FK into tables/phases/pipes),
  // so its rows for this table's fields must be cleaned up explicitly here.
  await db
    .delete(fields)
    .where(and(eq(fields.ownerType, "table"), eq(fields.ownerId, tableId)));
}

export async function listTableFields(tableId: string): Promise<Field[]> {
  return listFields("table", tableId);
}

// --- Typed value parsing (mirrors the target's date/currency input formats) ---

function parseBrDate(raw: string): Date | null {
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const date = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseBrDatetime(raw: string): Date | null {
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, dd, mm, yyyy, hh, min] = match;
  const date = new Date(
    Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min)),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

interface TypedColumns {
  dateValue: Date | null;
  datetimeValue: Date | null;
  floatValue: number | null;
}

function computeTypedColumns(type: string, raw: string): TypedColumns {
  if (type === "date" || type === "due_date") {
    return {
      dateValue: parseBrDate(raw),
      datetimeValue: null,
      floatValue: null,
    };
  }
  if (type === "datetime") {
    return {
      dateValue: null,
      datetimeValue: parseBrDatetime(raw),
      floatValue: null,
    };
  }
  if (type === "currency" || type === "number") {
    const parsed = Number.parseFloat(raw);
    return {
      dateValue: null,
      datetimeValue: null,
      floatValue: Number.isNaN(parsed) ? null : parsed,
    };
  }
  return { dateValue: null, datetimeValue: null, floatValue: null };
}

function resolveTitleFieldId(table: Table, fields: Field[]): string | null {
  return table.titleFieldId ?? fields[0]?.id ?? null;
}

// --- Records -----------------------------------------------------------

export interface RecordSummary {
  record: TableRecord;
  title: string;
  values: Record<string, string>;
}

export async function listRecordsForTable(
  tableId: string,
): Promise<RecordSummary[]> {
  const table = await getTable(tableId);
  if (!table) {
    throw new Error("Table not found");
  }
  const tableFields = await listTableFields(tableId);
  const titleFieldId = resolveTitleFieldId(table, tableFields);

  const records = await db
    .select()
    .from(tableRecords)
    .where(eq(tableRecords.tableId, tableId))
    .orderBy(desc(tableRecords.createdAt));
  if (records.length === 0) return [];

  const recordIds = records.map((r) => r.id);
  const allValues = await db
    .select()
    .from(tableRecordFieldValues)
    .where(inArray(tableRecordFieldValues.recordId, recordIds));

  const valuesByRecord = new Map<string, Record<string, string>>();
  for (const v of allValues) {
    const bucket = valuesByRecord.get(v.recordId) ?? {};
    bucket[v.fieldId] = v.value;
    valuesByRecord.set(v.recordId, bucket);
  }

  return records.map((record) => {
    const values = valuesByRecord.get(record.id) ?? {};
    return {
      record,
      title: titleFieldId ? (values[titleFieldId] ?? "") : "",
      values,
    };
  });
}

export async function createRecord(
  tableId: string,
  values: Record<string, string>,
): Promise<RecordSummary> {
  const table = await getTable(tableId);
  if (!table) {
    throw new Error("Table not found");
  }
  const tableFields = await listTableFields(tableId);

  for (const field of tableFields) {
    if (field.required && !(values[field.id] ?? "").trim()) {
      throw new Error(`"${field.label}" is required`);
    }
  }

  const [record] = await db
    .insert(tableRecords)
    .values({ tableId })
    .returning();

  if (tableFields.length > 0) {
    await db.insert(tableRecordFieldValues).values(
      tableFields.map((field) => {
        const raw = values[field.id] ?? "";
        return {
          recordId: record.id,
          fieldId: field.id,
          value: raw,
          ...computeTypedColumns(field.type, raw),
        };
      }),
    );
  }

  const titleFieldId = resolveTitleFieldId(table, tableFields);
  const storedValues = Object.fromEntries(
    tableFields.map((field) => [field.id, values[field.id] ?? ""]),
  );

  await triggerWebhookEvent("table", tableId, "table.record.created", {
    recordId: record.id,
    values: storedValues,
  });

  return {
    record,
    title: titleFieldId ? (storedValues[titleFieldId] ?? "") : "",
    values: storedValues,
  };
}

export interface RecordDetail {
  record: TableRecord;
  table: Table;
  fields: Field[];
  values: Record<string, string>;
  title: string;
}

export async function getRecordDetail(
  recordId: string,
): Promise<RecordDetail | null> {
  const [record] = await db
    .select()
    .from(tableRecords)
    .where(eq(tableRecords.id, recordId));
  if (!record) return null;

  const table = await getTable(record.tableId);
  if (!table) return null;

  const fields = await listTableFields(table.id);
  const rows = await db
    .select()
    .from(tableRecordFieldValues)
    .where(eq(tableRecordFieldValues.recordId, recordId));
  const values = Object.fromEntries(rows.map((r) => [r.fieldId, r.value]));
  const titleFieldId = resolveTitleFieldId(table, fields);

  return {
    record,
    table,
    fields,
    values,
    title: titleFieldId ? (values[titleFieldId] ?? "") : "",
  };
}

export async function setRecordFieldValue(
  recordId: string,
  fieldId: string,
  rawValue: string,
): Promise<void> {
  const [record] = await db
    .select()
    .from(tableRecords)
    .where(eq(tableRecords.id, recordId));
  if (!record) {
    throw new Error("Record not found");
  }

  const tableFields = await listTableFields(record.tableId);
  const field = tableFields.find((f) => f.id === fieldId);
  if (!field) {
    throw new Error("Field not found on this table");
  }

  const typed = computeTypedColumns(field.type, rawValue);
  const now = new Date();

  await db
    .insert(tableRecordFieldValues)
    .values({ recordId, fieldId, value: rawValue, ...typed, filledAt: now })
    .onConflictDoUpdate({
      target: [tableRecordFieldValues.recordId, tableRecordFieldValues.fieldId],
      set: { value: rawValue, ...typed, filledAt: now },
    });

  await db
    .update(tableRecords)
    .set({ updatedAt: now })
    .where(eq(tableRecords.id, recordId));

  await triggerWebhookEvent("table", record.tableId, "table.record.updated", {
    recordId,
    fieldId,
    value: rawValue,
  });
}

export async function deleteRecord(recordId: string): Promise<void> {
  const remaining = await db
    .delete(tableRecords)
    .where(eq(tableRecords.id, recordId))
    .returning({ id: tableRecords.id });
  if (remaining.length === 0) {
    throw new Error("Record not found");
  }
}
