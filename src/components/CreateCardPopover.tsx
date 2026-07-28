"use client";

import { isChoiceFieldType } from "@/lib/field-types";
import type { Field } from "@/lib/fields";
import type { Dictionary } from "@/lib/i18n";
import { useState } from "react";

function htmlInputType(type: Field["type"]): string {
  switch (type) {
    case "number":
    case "currency":
      return "number";
    case "date":
    case "due_date":
      return "date";
    case "datetime":
      return "datetime-local";
    case "time":
      return "time";
    case "email":
      return "email";
    default:
      return "text";
  }
}

export function CreateCardPopover({
  fields,
  dictionary,
  submitting,
  onCancel,
  onSubmit,
}: {
  fields: Field[];
  dictionary: Dictionary;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (values: Record<string, string>) => Promise<string | undefined>;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  function setValue(fieldId: string, value: string) {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  }

  async function handleSubmit() {
    const errors: Record<string, string> = {};
    for (const field of fields) {
      if (field.required && !(values[field.id] ?? "").trim()) {
        errors[field.id] = dictionary.card.requiredError;
      }
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setFormError(null);
    const result = await onSubmit(values);
    if (typeof result === "string") {
      setFormError(result);
    }
  }

  return (
    <div
      data-testid="create-card-popover"
      className="w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-xl"
    >
      <div className="space-y-3">
        {fields.map((field) => (
          <div
            key={field.id}
            data-testid="create-card-field"
            data-field-id={field.id}
          >
            <label
              className="mb-1 block text-xs font-medium text-gray-700"
              htmlFor={`create-card-field-${field.id}`}
            >
              {field.label}
              {field.required && <span className="text-red-500"> *</span>}
            </label>
            {isChoiceFieldType(field.type) ? (
              <select
                id={`create-card-field-${field.id}`}
                data-testid="create-card-field-input"
                value={values[field.id] ?? ""}
                onChange={(event) => setValue(field.id, event.target.value)}
                className={`w-full rounded-md border px-3 py-2 text-sm ${
                  fieldErrors[field.id] ? "border-red-500" : "border-gray-200"
                }`}
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
                id={`create-card-field-${field.id}`}
                data-testid="create-card-field-input"
                type={htmlInputType(field.type)}
                value={values[field.id] ?? ""}
                onChange={(event) => setValue(field.id, event.target.value)}
                className={`w-full rounded-md border px-3 py-2 text-sm ${
                  fieldErrors[field.id] ? "border-red-500" : "border-gray-200"
                }`}
              />
            )}
            {fieldErrors[field.id] && (
              <p
                data-testid="create-card-field-error"
                className="mt-1 text-xs text-red-600"
              >
                {fieldErrors[field.id]}
              </p>
            )}
          </div>
        ))}

        {formError && <p className="text-sm text-red-600">{formError}</p>}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            {dictionary.card.cancel}
          </button>
          <button
            type="button"
            data-testid="submit-create-card"
            disabled={submitting}
            onClick={handleSubmit}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {dictionary.card.submit}
          </button>
        </div>
      </div>
    </div>
  );
}
