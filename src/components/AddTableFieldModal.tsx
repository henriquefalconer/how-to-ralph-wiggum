"use client";

import {
  FIELD_TYPES,
  type FieldType,
  isChoiceFieldType,
} from "@/lib/field-types";
import type { Dictionary } from "@/lib/i18n";
import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";

export function AddTableFieldModal({
  dictionary,
  onClose,
  onCreate,
}: {
  dictionary: Dictionary;
  onClose: () => void;
  onCreate: (input: {
    label: string;
    type: FieldType;
    required: boolean;
    options: string[];
  }) => Promise<string | undefined>;
}) {
  const [type, setType] = useState<FieldType | null>(null);
  const [label, setLabel] = useState("");
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState<string[]>([""]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!type || !label.trim()) return;

    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (isChoiceFieldType(type) && cleanOptions.length === 0) {
      setError(dictionary.fieldEditor.optionsHeading);
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await onCreate({
      label: label.trim(),
      type,
      required,
      options: cleanOptions,
    });
    setSubmitting(false);
    if (typeof result === "string") {
      setError(result);
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
          data-testid="add-table-field-modal"
          className="fixed top-1/2 left-1/2 max-h-[85vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
        >
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              {dictionary.fieldEditor.addField}
            </Dialog.Title>
            <Dialog.Close
              aria-label={dictionary.database.close}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </Dialog.Close>
          </div>

          {!type ? (
            <div
              data-testid="field-type-palette"
              className="grid grid-cols-2 gap-2"
            >
              {FIELD_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  data-testid={`field-type-${t}`}
                  onClick={() => setType(t)}
                  className="rounded-md border border-gray-200 px-3 py-2 text-left text-sm text-gray-700 hover:border-gray-400"
                >
                  {dictionary.fieldEditor.types[t]}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label
                  className="mb-1 block text-xs font-medium text-gray-700"
                  htmlFor="field-label"
                >
                  {dictionary.fieldEditor.labelInputLabel}
                </label>
                <input
                  id="field-label"
                  data-testid="field-label-input"
                  type="text"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder={dictionary.fieldEditor.labelPlaceholder}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                  // biome-ignore lint/a11y/noAutofocus: opens right after picking a field type
                  autoFocus
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={required}
                  onChange={(event) => setRequired(event.target.checked)}
                />
                {dictionary.fieldEditor.requiredCheckbox}
              </label>
              {isChoiceFieldType(type) && (
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-700">
                    {dictionary.fieldEditor.optionsHeading}
                  </p>
                  {options.map((option, index) => (
                    <input
                      // biome-ignore lint/suspicious/noArrayIndexKey: options are positional and reordered by index only on removal below
                      key={index}
                      data-testid="field-option-input"
                      type="text"
                      value={option}
                      onChange={(event) =>
                        setOptions((prev) =>
                          prev.map((o, i) =>
                            i === index ? event.target.value : o,
                          ),
                        )
                      }
                      placeholder={dictionary.fieldEditor.optionPlaceholder}
                      className="mb-2 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                    />
                  ))}
                  <button
                    type="button"
                    data-testid="add-field-option"
                    onClick={() => setOptions((prev) => [...prev, ""])}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    {dictionary.fieldEditor.addOption}
                  </button>
                </div>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setType(null)}
                  className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  {dictionary.fieldEditor.cancel}
                </button>
                <button
                  type="button"
                  data-testid="submit-add-field"
                  disabled={!label.trim() || submitting}
                  onClick={handleSubmit}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {dictionary.fieldEditor.save}
                </button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
