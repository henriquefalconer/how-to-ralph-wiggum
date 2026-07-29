"use client";

import { formatCurrencyInput, isChoiceFieldType } from "@/lib/field-types";
import type { Field } from "@/lib/fields";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import Link from "next/link";
import { useState } from "react";

export function RecordDetailView({
  tableId,
  recordId,
  fields,
  initialValues,
  titleFieldId,
  dictionary,
}: {
  tableId: string;
  recordId: string;
  fields: Field[];
  initialValues: Record<string, string>;
  titleFieldId: string | null;
  dictionary: Dictionary;
}) {
  const [values, setValues] = useState(initialValues);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const title = titleFieldId ? (values[titleFieldId] ?? "") : "";

  function startEdit(field: Field) {
    setEditingFieldId(field.id);
    setDraft(values[field.id] ?? "");
  }

  async function saveEdit(field: Field) {
    setSaving(true);
    const response = await fetch(
      `/api/tables/${tableId}/records/${recordId}/field-values`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldId: field.id, value: draft }),
      },
    );
    setSaving(false);
    if (response.ok) {
      setValues((prev) => ({ ...prev, [field.id]: draft }));
      setUpdatedAt(new Date());
      setEditingFieldId(null);
    }
  }

  return (
    <section className="mx-auto max-w-2xl">
      <Link
        href={`/apollo_databases/${tableId}`}
        data-testid="back-to-grid"
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        {dictionary.database.detail.backToGrid}
      </Link>
      <div className="mt-2 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-700 text-white">
          ▤
        </span>
        <div>
          <h1
            data-testid="record-title"
            className="text-lg font-semibold text-gray-900"
          >
            {title || "—"}
          </h1>
          {titleFieldId && (
            <span
              data-testid="record-title-badge"
              className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
            >
              {title || "—"}
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-xs font-semibold text-gray-500 uppercase">
          {dictionary.database.detail.infoHeading}
        </h2>
        {fields.length === 0 ? (
          <p className="text-sm text-gray-500">
            {dictionary.database.detail.noFields}
          </p>
        ) : (
          <dl className="space-y-4">
            {fields.map((field) => (
              <div
                key={field.id}
                data-testid="record-field-row"
                data-field-id={field.id}
                className="group"
              >
                <dt className="flex items-center justify-between text-xs font-medium text-gray-500">
                  {field.label}
                  {editingFieldId !== field.id && (
                    <button
                      type="button"
                      data-testid="edit-field-button"
                      onClick={() => startEdit(field)}
                      className="hidden text-blue-600 hover:underline group-hover:inline"
                    >
                      {dictionary.database.detail.edit}
                    </button>
                  )}
                </dt>
                {editingFieldId === field.id ? (
                  <dd className="mt-1 flex items-center gap-2">
                    {isChoiceFieldType(field.type) ? (
                      <select
                        data-testid="edit-field-input"
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-sm"
                      >
                        <option value="" />
                        {field.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        data-testid="edit-field-input"
                        type="text"
                        value={draft}
                        onChange={(event) =>
                          setDraft(
                            field.type === "currency"
                              ? formatCurrencyInput(event.target.value)
                              : event.target.value,
                          )
                        }
                        className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-sm"
                      />
                    )}
                    <button
                      type="button"
                      data-testid="save-field-edit"
                      disabled={saving}
                      onClick={() => saveEdit(field)}
                      className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      {dictionary.database.detail.save}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingFieldId(null)}
                      className="rounded-md px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                    >
                      {dictionary.database.detail.cancel}
                    </button>
                  </dd>
                ) : (
                  <dd
                    data-testid="record-field-value"
                    className="mt-1 text-sm text-gray-900"
                  >
                    {values[field.id] || "—"}
                  </dd>
                )}
              </div>
            ))}
          </dl>
        )}
      </div>

      {updatedAt && (
        <p
          data-testid="record-updated-at"
          className="mt-4 text-xs text-gray-400"
        >
          {dictionary.database.detail.updatedAtLabel.replace(
            "{date}",
            updatedAt.toLocaleString(),
          )}
        </p>
      )}
    </section>
  );
}
