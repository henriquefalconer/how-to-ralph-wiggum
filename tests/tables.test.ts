import { db } from "@/lib/db";
import { organizations, tableRecordFieldValues } from "@/lib/db/schema";
import { formatCurrencyInput } from "@/lib/field-types";
import { createField } from "@/lib/fields";
import {
  createRecord,
  createTable,
  deleteRecord,
  deleteTable,
  getRecordDetail,
  getTable,
  listRecordsForTable,
  listTableFields,
  listTables,
  setRecordFieldValue,
  updateTableSettings,
} from "@/lib/tables";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("tables", () => {
  let orgId: string;

  beforeAll(async () => {
    const [org] = await db
      .insert(organizations)
      .values({ name: "Test Org (tables.test.ts)" })
      .returning();
    orgId = org.id;
  });

  afterAll(async () => {
    await db.delete(organizations).where(eq(organizations.id, orgId));
  });

  it("creates a database table with default settings", async () => {
    const table = await createTable(orgId, "Suppliers");
    expect(table.name).toBe("Suppliers");
    expect(table.public).toBe(true);
    expect(table.titleFieldId).toBeNull();
    expect(table.createButtonLabel).toBe("Criar registro");
  });

  it("rejects creating a table with a blank name", async () => {
    await expect(createTable(orgId, "   ")).rejects.toThrow(/name/i);
  });

  it("lists tables for an org with their live record counts", async () => {
    const table = await createTable(orgId, "Invoices");
    await createRecord(table.id, {});
    await createRecord(table.id, {});

    const tables = await listTables(orgId);
    const found = tables.find((t) => t.id === table.id);
    expect(found?.recordsCount).toBe(2);
  });

  it("empty table (no records) returns an empty list", async () => {
    const table = await createTable(orgId, "Empty Table");
    const records = await listRecordsForTable(table.id);
    expect(records).toEqual([]);
  });

  it("rejects a duplicate field label in the same table, matching the confirmed target validation", async () => {
    const table = await createTable(orgId, "Contacts");
    await createField("table", table.id, {
      label: "Status",
      type: "short_text",
    });
    await expect(
      createField("table", table.id, { label: "Status", type: "short_text" }),
    ).rejects.toThrow(/já está em uso|already in use/i);
  });

  it("stores a typed value alongside the raw value for a date field", async () => {
    const table = await createTable(orgId, "Renewals");
    const dateField = await createField("table", table.id, {
      label: "Due",
      type: "date",
    });
    const record = await createRecord(table.id, {});

    await setRecordFieldValue(record.record.id, dateField.id, "25/12/2026");

    const [row] = await db
      .select()
      .from(tableRecordFieldValues)
      .where(
        and(
          eq(tableRecordFieldValues.recordId, record.record.id),
          eq(tableRecordFieldValues.fieldId, dateField.id),
        ),
      );
    expect(row.value).toBe("25/12/2026");
    expect(row.dateValue).toBeInstanceOf(Date);
    expect(Number.isNaN(row.dateValue?.getTime())).toBe(false);
  });

  it("derives the record title from the configured title_field_id, not the first field created", async () => {
    const table = await createTable(orgId, "Suppliers Titled");
    const valorField = await createField("table", table.id, {
      label: "Valor",
      type: "number",
    });
    const statusField = await createField("table", table.id, {
      label: "Status",
      type: "short_text",
    });

    await updateTableSettings(table.id, { titleFieldId: statusField.id });

    const record = await createRecord(table.id, {
      [valorField.id]: "100",
      [statusField.id]: "Ativo",
    });

    expect(record.title).toBe("Ativo");
  });

  it("falls back to the first field as the title when no title_field_id is configured", async () => {
    const table = await createTable(orgId, "No Title Field Configured");
    const firstField = await createField("table", table.id, {
      label: "Name",
      type: "short_text",
    });

    const record = await createRecord(table.id, { [firstField.id]: "Acme" });
    expect(record.title).toBe("Acme");
  });

  it("masks raw digit input as cents for currency fields", () => {
    expect(formatCurrencyInput("15000")).toBe("150.00");
    expect(formatCurrencyInput("5")).toBe("0.05");
    expect(formatCurrencyInput("")).toBe("");
  });

  it("rejects creating a record missing a required field", async () => {
    const table = await createTable(orgId, "Required Field Table");
    await createField("table", table.id, {
      label: "Name",
      type: "short_text",
      required: true,
    });

    await expect(createRecord(table.id, {})).rejects.toThrow(/required/i);
  });

  it("record detail reflects an inline field edit immediately, including the derived title", async () => {
    const table = await createTable(orgId, "Detail Table");
    const statusField = await createField("table", table.id, {
      label: "Status",
      type: "short_text",
    });
    await updateTableSettings(table.id, { titleFieldId: statusField.id });
    const record = await createRecord(table.id, {
      [statusField.id]: "Ativo",
    });

    await setRecordFieldValue(record.record.id, statusField.id, "Inativo");

    const detail = await getRecordDetail(record.record.id);
    expect(detail?.values[statusField.id]).toBe("Inativo");
    expect(detail?.title).toBe("Inativo");
  });

  it("deletes a record", async () => {
    const table = await createTable(orgId, "Deletable Records");
    const record = await createRecord(table.id, {});

    await deleteRecord(record.record.id);

    const detail = await getRecordDetail(record.record.id);
    expect(detail).toBeNull();
  });

  it("deletes a table and cascades its fields and records", async () => {
    const table = await createTable(orgId, "Deletable Table");
    await createField("table", table.id, { label: "Name", type: "short_text" });
    await createRecord(table.id, {});

    await deleteTable(table.id);

    expect(await getTable(table.id)).toBeNull();
    expect(await listTableFields(table.id)).toEqual([]);
  });
});
