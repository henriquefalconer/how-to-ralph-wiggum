"use client";

import { formatCurrencyInput, isChoiceFieldType } from "@/lib/field-types";
import type { Field } from "@/lib/fields";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";

function htmlInputType(type: Field["type"]): string {
  switch (type) {
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

export function CreateRecordModal({
  fields,
  dictionary,
  onClose,
  onSubmit,
}: {
  fields: Field[];
  dictionary: Dictionary;
  onClose: () => void;
  onSubmit: (values: Record<string, string>) => Promise<string | undefined>;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function setValue(field: Field, raw: string) {
    const next = field.type === "currency" ? formatCurrencyInput(raw) : raw;
    setValues((prev) => ({ ...prev, [field.id]: next }));
  }

  async function handleSubmit() {
    const errors: Record<string, string> = {};
    for (const field of fields) {
      if (field.required && !(values[field.id] ?? "").trim()) {
        errors[field.id] = dictionary.database.requiredError;
      }
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setFormError(null);
    setSubmitting(true);
    const result = await onSubmit(values);
    setSubmitting(false);
    if (typeof result === "string") {
      setFormError(result);
    }
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content
          data-testid="create-record-modal"
          className="fixed top-1/2 left-1/2 max-h-[85vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
        >
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              {dictionary.database.createRecord}
            </Dialog.Title>
            <Dialog.Close
              aria-label={dictionary.database.close}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </Dialog.Close>
          </div>

          <div className="space-y-3">
            {fields.map((field) => (
              <div
                key={field.id}
                data-testid="create-record-field"
                data-field-id={field.id}
              >
                <label
                  className="mb-1 block text-xs font-medium text-gray-700"
                  htmlFor={`create-record-field-${field.id}`}
                >
                  {field.label}
                  {field.required && <span className="text-red-500"> *</span>}
                </label>
                {isChoiceFieldType(field.type) ? (
                  <select
                    id={`create-record-field-${field.id}`}
                    data-testid="create-record-field-input"
                    value={values[field.id] ?? ""}
                    onChange={(event) => setValue(field, event.target.value)}
                    className={`w-full rounded-md border px-3 py-2 text-sm ${
                      fieldErrors[field.id]
                        ? "border-red-500"
                        : "border-gray-200"
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
                    id={`create-record-field-${field.id}`}
                    data-testid="create-record-field-input"
                    type={htmlInputType(field.type)}
                    value={values[field.id] ?? ""}
                    onChange={(event) => setValue(field, event.target.value)}
                    className={`w-full rounded-md border px-3 py-2 text-sm ${
                      fieldErrors[field.id]
                        ? "border-red-500"
                        : "border-gray-200"
                    }`}
                  />
                )}
                {fieldErrors[field.id] && (
                  <p
                    data-testid="create-record-field-error"
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
                onClick={onClose}
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                {dictionary.database.cancel}
              </button>
              <button
                type="button"
                data-testid="submit-create-record"
                disabled={submitting}
                onClick={handleSubmit}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {dictionary.database.createRecord}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
