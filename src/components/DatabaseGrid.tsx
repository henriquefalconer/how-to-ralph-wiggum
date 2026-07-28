"use client";

import type { FieldType } from "@/lib/field-types";
import type { Field } from "@/lib/fields";
import type { Dictionary } from "@/lib/i18n";
import { formatRecordsCount } from "@/lib/i18n/format";
import type { RecordSummary, Table } from "@/lib/tables";
import Link from "next/link";
import { useState } from "react";
import { AddTableFieldModal } from "./AddTableFieldModal";
import { CreateRecordModal } from "./CreateRecordModal";

export function DatabaseGrid({
  table,
  fields: initialFields,
  initialRecords,
  dictionary,
}: {
  table: Table;
  fields: Field[];
  initialRecords: RecordSummary[];
  dictionary: Dictionary;
}) {
  const [fields, setFields] = useState(initialFields);
  const [records, setRecords] = useState(initialRecords);
  const [createOpen, setCreateOpen] = useState(false);
  const [addFieldOpen, setAddFieldOpen] = useState(false);

  async function handleCreateRecord(
    values: Record<string, string>,
  ): Promise<string | undefined> {
    const response = await fetch(`/api/tables/${table.id}/records`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return body.error ?? "Failed to create record";
    }
    const { record: created } = await response.json();
    setRecords((prev) => [created, ...prev]);
    setCreateOpen(false);
    return undefined;
  }

  async function handleCreateField(input: {
    label: string;
    type: FieldType;
    required: boolean;
    options: string[];
  }): Promise<string | undefined> {
    const response = await fetch(`/api/tables/${table.id}/fields`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return body.error ?? "Failed to create field";
    }
    const { field } = await response.json();
    setFields((prev) => [...prev, field]);
    setAddFieldOpen(false);
    return undefined;
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            {dictionary.database.backToHome}
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">{table.name}</h1>
          <p data-testid="records-count" className="text-xs text-gray-500">
            {formatRecordsCount(dictionary, records.length)}
          </p>
        </div>
        <button
          type="button"
          data-testid="create-record-button"
          onClick={() => setCreateOpen(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {table.createButtonLabel || dictionary.database.createRecord}
        </button>
      </div>

      {records.length === 0 ? (
        <p
          data-testid="database-empty-state"
          className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500"
        >
          {dictionary.database.emptyState}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500">
                <th className="px-4 py-2">{dictionary.database.titleColumn}</th>
                {fields.map((field) => (
                  <th key={field.id} className="px-4 py-2">
                    {field.label}
                  </th>
                ))}
                <th className="px-4 py-2">
                  <button
                    type="button"
                    data-testid="add-field-column"
                    onClick={() => setAddFieldOpen(true)}
                    className="text-gray-400 hover:text-gray-700"
                  >
                    +
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {records.map(({ record, title, values }) => (
                <tr
                  key={record.id}
                  data-testid="database-record-row"
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="px-4 py-2">
                    <Link
                      href={`/apollo_databases/${table.id}/records/${record.id}`}
                      data-testid="record-title-link"
                      className="font-medium text-gray-900 hover:underline"
                    >
                      {title || "—"}
                    </Link>
                  </td>
                  {fields.map((field) => (
                    <td
                      key={field.id}
                      data-testid="database-record-cell"
                      className="px-4 py-2 text-gray-700"
                    >
                      {values[field.id] || "—"}
                    </td>
                  ))}
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {createOpen && (
        <CreateRecordModal
          fields={fields}
          dictionary={dictionary}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreateRecord}
        />
      )}
      {addFieldOpen && (
        <AddTableFieldModal
          dictionary={dictionary}
          onClose={() => setAddFieldOpen(false)}
          onCreate={handleCreateField}
        />
      )}
    </section>
  );
}
