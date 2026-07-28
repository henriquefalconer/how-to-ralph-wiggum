"use client";

import {
  FIELD_TYPES,
  type FieldType,
  isChoiceFieldType,
} from "@/lib/field-types";
import type { Field } from "@/lib/fields";
import type { Dictionary } from "@/lib/i18n";
import type { Phase } from "@/lib/phases";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface PipeSummary {
  id: string;
  name: string;
  color: string;
}

export function PhaseEditor({
  pipe,
  phases,
  currentPhaseId,
  fields,
  dictionary,
}: {
  pipe: PipeSummary;
  phases: Phase[];
  currentPhaseId: string;
  fields: Field[];
  dictionary: Dictionary;
}) {
  const router = useRouter();
  const currentPhase = phases.find((p) => p.id === currentPhaseId);

  const [modalOpen, setModalOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [name, setName] = useState(currentPhase?.name ?? "");
  const [color, setColor] = useState(currentPhase?.color ?? "#2E68D9");
  const [description, setDescription] = useState(
    currentPhase?.description ?? "",
  );
  const [done, setDone] = useState(currentPhase?.done ?? false);
  const [allowCardCreation, setAllowCardCreation] = useState(
    currentPhase?.allowCardCreation ?? false,
  );
  const [collectTaskEmails, setCollectTaskEmails] = useState(
    currentPhase?.collectTaskEmails ?? false,
  );
  const [slaTime, setSlaTime] = useState(
    currentPhase?.slaTime != null ? String(currentPhase.slaTime) : "",
  );
  const [slaUnit, setSlaUnit] = useState<"" | "hours" | "days">(
    currentPhase?.slaUnit ?? "",
  );
  const [saving, setSaving] = useState(false);

  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [fieldType, setFieldType] = useState<FieldType>("short_text");
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldHelp, setFieldHelp] = useState("");
  const [fieldDescription, setFieldDescription] = useState("");
  const [fieldOptions, setFieldOptions] = useState<
    { key: string; value: string }[]
  >([{ key: "0", value: "" }]);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [savingField, setSavingField] = useState(false);
  const nextOptionKey = useRef(1);

  useEffect(() => {
    if (!currentPhase) return;
    setName(currentPhase.name);
    setColor(currentPhase.color);
    setDescription(currentPhase.description ?? "");
    setDone(currentPhase.done);
    setAllowCardCreation(currentPhase.allowCardCreation);
    setCollectTaskEmails(currentPhase.collectTaskEmails);
    setSlaTime(
      currentPhase.slaTime != null ? String(currentPhase.slaTime) : "",
    );
    setSlaUnit(currentPhase.slaUnit ?? "");
    setError(null);
    setConfirmingDelete(false);
  }, [currentPhase]);

  if (!currentPhase) return null;

  function keyedOptions(values: string[]): { key: string; value: string }[] {
    return values.map((value) => {
      const key = String(nextOptionKey.current);
      nextOptionKey.current += 1;
      return { key, value };
    });
  }

  function openCreateFieldModal(type: FieldType) {
    setEditingFieldId(null);
    setFieldType(type);
    setFieldLabel("");
    setFieldRequired(false);
    setFieldHelp("");
    setFieldDescription("");
    setFieldOptions(keyedOptions([""]));
    setFieldError(null);
    setFieldModalOpen(true);
  }

  function openEditFieldModal(field: Field) {
    setEditingFieldId(field.id);
    setFieldType(field.type as FieldType);
    setFieldLabel(field.label);
    setFieldRequired(field.required);
    setFieldHelp(field.help ?? "");
    setFieldDescription(field.description ?? "");
    setFieldOptions(
      keyedOptions(field.options.length > 0 ? field.options : [""]),
    );
    setFieldError(null);
    setFieldModalOpen(true);
  }

  async function handleSaveField() {
    setSavingField(true);
    setFieldError(null);
    const trimmedOptions = fieldOptions
      .map((option) => option.value.trim())
      .filter((value) => value.length > 0);

    try {
      const url = editingFieldId
        ? `/api/phases/${currentPhase?.id}/fields/${editingFieldId}`
        : `/api/phases/${currentPhase?.id}/fields`;
      const response = await fetch(url, {
        method: editingFieldId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: fieldLabel,
          type: fieldType,
          required: fieldRequired,
          help: fieldHelp || null,
          description: fieldDescription || null,
          options: isChoiceFieldType(fieldType) ? trimmedOptions : undefined,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save field");
      }
      setFieldModalOpen(false);
      router.refresh();
    } catch (err) {
      setFieldError(
        err instanceof Error ? err.message : "Failed to save field",
      );
    } finally {
      setSavingField(false);
    }
  }

  async function handleDeleteField(fieldId: string) {
    try {
      const response = await fetch(
        `/api/phases/${currentPhase?.id}/fields/${fieldId}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to delete field");
      }
      router.refresh();
    } catch {
      // Surfaced implicitly by the field remaining in the list; kept minimal for now.
    }
  }

  function updateOption(key: string, value: string) {
    setFieldOptions((options) =>
      options.map((option) => (option.key === key ? { key, value } : option)),
    );
  }

  function removeOption(key: string) {
    setFieldOptions((options) =>
      options.filter((option) => option.key !== key),
    );
  }

  function addOption() {
    setFieldOptions((options) => [
      ...options,
      { key: String(nextOptionKey.current++), value: "" },
    ]);
  }

  async function handleSwitchPhase(phaseId: string) {
    router.push(`/pipes/${pipe.id}/settings/phases/${phaseId}`);
  }

  async function handleCreatePhase() {
    setCreating(true);
    setError(null);
    try {
      const response = await fetch(`/api/pipes/${pipe.id}/phases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: dictionary.phaseSettings.newPhaseNamePlaceholder,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to create phase");
      }
      const { phase } = await response.json();
      router.push(`/pipes/${pipe.id}/settings/phases/${phase.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create phase");
    } finally {
      setCreating(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/phases/${currentPhase?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          color,
          description: description || null,
          done,
          allowCardCreation,
          collectTaskEmails,
          slaTime: slaTime ? Number(slaTime) : null,
          slaUnit: slaTime ? slaUnit || null : null,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save phase");
      }
      setModalOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save phase");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setError(null);
    try {
      const response = await fetch(`/api/phases/${currentPhase?.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to delete phase");
      }
      setModalOpen(false);
      const remaining = phases.filter((p) => p.id !== currentPhase?.id);
      if (remaining.length > 0) {
        router.push(`/pipes/${pipe.id}/settings/phases/${remaining[0].id}`);
      } else {
        router.push(`/pipes/${pipe.id}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete phase");
      setConfirmingDelete(false);
    }
  }

  return (
    <div className="flex">
      <aside
        data-testid="field-palette"
        className="w-56 shrink-0 border-r border-gray-200 bg-white p-4"
      >
        <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
          {dictionary.phaseSettings.fieldPaletteHeading}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {FIELD_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              data-testid={`field-type-${type}`}
              onClick={() => openCreateFieldModal(type)}
              className="rounded-md border border-gray-200 px-2 py-1.5 text-left text-xs text-gray-700 hover:border-blue-400 hover:bg-blue-50"
            >
              {dictionary.fieldEditor.types[type]}
            </button>
          ))}
        </div>
      </aside>

      <div className="flex-1 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <select
              data-testid="phase-switcher"
              value={currentPhase.id}
              onChange={(event) => handleSwitchPhase(event.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-800"
            >
              {phases.map((phase) => (
                <option key={phase.id} value={phase.id}>
                  {phase.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              data-testid="create-phase-button"
              disabled={creating}
              onClick={handleCreatePhase}
              className="rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 disabled:opacity-50"
            >
              + {dictionary.phaseSettings.createPhase}
            </button>
          </div>
          <button
            type="button"
            data-testid="advanced-options-button"
            onClick={() => setModalOpen(true)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {dictionary.phaseSettings.advancedOptions}
          </button>
        </div>

        {currentPhase.done && (
          <span
            data-testid="phase-final-badge"
            className="mb-2 inline-block rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800"
          >
            {dictionary.phaseSettings.finalPhaseBadge}
          </span>
        )}
        <h1
          data-testid="phase-name-heading"
          className="text-xl font-semibold text-gray-900"
        >
          {currentPhase.name}
        </h1>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">
              {dictionary.fieldEditor.fieldsHeading}
            </p>
            <button
              type="button"
              data-testid="add-field-button"
              onClick={() => openCreateFieldModal("short_text")}
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              + {dictionary.fieldEditor.addField}
            </button>
          </div>

          {fields.length === 0 ? (
            <p data-testid="fields-empty" className="text-xs text-gray-400">
              {dictionary.fieldEditor.emptyState}
            </p>
          ) : (
            <ul className="space-y-2">
              {fields.map((field) => (
                <li
                  key={field.id}
                  data-testid="field-row"
                  data-field-id={field.id}
                  className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2"
                >
                  <div>
                    <span className="text-sm font-medium text-gray-800">
                      {field.label}
                    </span>
                    <span className="ml-2 text-xs text-gray-400">
                      {dictionary.fieldEditor.types[field.type as FieldType]}
                    </span>
                    {field.required && (
                      <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                        {dictionary.fieldEditor.requiredBadge}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid="edit-field-button"
                      onClick={() => openEditFieldModal(field)}
                      className="text-xs text-gray-500 hover:underline"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      data-testid="delete-field-button"
                      onClick={() => handleDeleteField(field.id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      {dictionary.fieldEditor.deleteField}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Link
          href={`/pipes/${pipe.id}`}
          className="mt-6 inline-block text-sm text-blue-600 hover:underline"
        >
          ← {dictionary.phaseSettings.backToBoard}
        </Link>
      </div>

      <Dialog.Root open={modalOpen} onOpenChange={setModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40" />
          <Dialog.Content
            data-testid="advanced-options-modal"
            className="fixed top-1/2 left-1/2 max-h-[85vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <Dialog.Title className="text-lg font-semibold text-gray-900">
                {dictionary.phaseSettings.advancedOptions}
              </Dialog.Title>
              <Dialog.Close className="text-gray-400 hover:text-gray-600">
                ✕
              </Dialog.Close>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  className="mb-1 block text-sm font-medium text-gray-700"
                  htmlFor="phase-name-input"
                >
                  {dictionary.phaseSettings.nameLabel}
                </label>
                <input
                  id="phase-name-input"
                  data-testid="phase-name-input"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label
                  className="mb-1 block text-sm font-medium text-gray-700"
                  htmlFor="phase-color-input"
                >
                  {dictionary.phaseSettings.colorLabel}
                </label>
                <input
                  id="phase-color-input"
                  data-testid="phase-color-input"
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  className="h-9 w-16 rounded-md border border-gray-200"
                />
              </div>

              <div>
                <label
                  className="mb-1 block text-sm font-medium text-gray-700"
                  htmlFor="phase-description-input"
                >
                  {dictionary.phaseSettings.descriptionLabel}
                </label>
                <textarea
                  id="phase-description-input"
                  data-testid="phase-description-input"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={dictionary.phaseSettings.descriptionPlaceholder}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                  rows={2}
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  data-testid="mark-final-checkbox"
                  type="checkbox"
                  checked={done}
                  onChange={(event) => setDone(event.target.checked)}
                />
                {dictionary.phaseSettings.markFinalCheckbox}
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  data-testid="allow-card-creation-checkbox"
                  type="checkbox"
                  checked={allowCardCreation}
                  onChange={(event) =>
                    setAllowCardCreation(event.target.checked)
                  }
                />
                {dictionary.phaseSettings.allowCardCreationCheckbox}
              </label>

              <div>
                <p className="mb-1 text-sm font-medium text-gray-700">
                  {dictionary.phaseSettings.manageTasksLabel}
                </p>
                <label className="mr-4 inline-flex items-center gap-1 text-sm text-gray-700">
                  <input
                    data-testid="collect-emails-radio-collect"
                    type="radio"
                    name="collect-task-emails"
                    checked={collectTaskEmails}
                    onChange={() => setCollectTaskEmails(true)}
                  />
                  {dictionary.phaseSettings.collectEmails}
                </label>
                <label className="inline-flex items-center gap-1 text-sm text-gray-700">
                  <input
                    data-testid="collect-emails-radio-none"
                    type="radio"
                    name="collect-task-emails"
                    checked={!collectTaskEmails}
                    onChange={() => setCollectTaskEmails(false)}
                  />
                  {dictionary.phaseSettings.doNotCollectEmails}
                </label>
              </div>

              <div>
                <p className="mb-1 text-sm font-medium text-gray-700">
                  {dictionary.phaseSettings.autoAssignLabel}
                </p>
                <p
                  data-testid="auto-assign-empty"
                  className="text-xs text-gray-400"
                >
                  {dictionary.phaseSettings.autoAssignEmpty}
                </p>
              </div>

              <div>
                <p className="mb-1 text-sm font-medium text-gray-700">
                  {dictionary.phaseSettings.slaLabel}
                </p>
                <div className="flex gap-2">
                  <input
                    data-testid="sla-time-input"
                    type="number"
                    min={0}
                    value={slaTime}
                    onChange={(event) => setSlaTime(event.target.value)}
                    placeholder={dictionary.phaseSettings.slaTimeLabel}
                    className="w-24 rounded-md border border-gray-200 px-3 py-2 text-sm"
                  />
                  <select
                    data-testid="sla-unit-select"
                    value={slaUnit}
                    disabled={!slaTime}
                    onChange={(event) =>
                      setSlaUnit(event.target.value as "" | "hours" | "days")
                    }
                    className="rounded-md border border-gray-200 px-3 py-2 text-sm disabled:opacity-50"
                  >
                    <option value="">
                      {dictionary.phaseSettings.slaUnitNone}
                    </option>
                    <option value="hours">
                      {dictionary.phaseSettings.slaUnitHours}
                    </option>
                    <option value="days">
                      {dictionary.phaseSettings.slaUnitDays}
                    </option>
                  </select>
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                {confirmingDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-600">
                      {dictionary.phaseSettings.deleteConfirm}
                    </span>
                    <button
                      type="button"
                      data-testid="confirm-delete-phase"
                      onClick={handleDelete}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                    >
                      {dictionary.phaseSettings.deletePhase}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(false)}
                      className="text-xs text-gray-500 hover:underline"
                    >
                      {dictionary.phaseSettings.cancel}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    data-testid="delete-phase-button"
                    onClick={() => setConfirmingDelete(true)}
                    className="text-sm font-medium text-red-600 hover:underline"
                  >
                    {dictionary.phaseSettings.deletePhase}
                  </button>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                  >
                    {dictionary.phaseSettings.cancel}
                  </button>
                  <button
                    type="button"
                    data-testid="save-advanced-options"
                    disabled={saving || !name.trim()}
                    onClick={handleSave}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {dictionary.phaseSettings.save}
                  </button>
                </div>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={fieldModalOpen} onOpenChange={setFieldModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40" />
          <Dialog.Content
            data-testid="field-editor-modal"
            className="fixed top-1/2 left-1/2 max-h-[85vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <Dialog.Title className="text-lg font-semibold text-gray-900">
                {dictionary.fieldEditor.types[fieldType]}
              </Dialog.Title>
              <Dialog.Close className="text-gray-400 hover:text-gray-600">
                ✕
              </Dialog.Close>
            </div>

            <div className="space-y-4">
              {!editingFieldId && (
                <div>
                  <label
                    className="mb-1 block text-sm font-medium text-gray-700"
                    htmlFor="field-type-select"
                  >
                    {dictionary.fieldEditor.typeLabel}
                  </label>
                  <select
                    id="field-type-select"
                    data-testid="field-type-select"
                    value={fieldType}
                    onChange={(event) =>
                      setFieldType(event.target.value as FieldType)
                    }
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                  >
                    {FIELD_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {dictionary.fieldEditor.types[type]}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label
                  className="mb-1 block text-sm font-medium text-gray-700"
                  htmlFor="field-label-input"
                >
                  {dictionary.fieldEditor.labelInputLabel}
                </label>
                <input
                  id="field-label-input"
                  data-testid="field-label-input"
                  type="text"
                  value={fieldLabel}
                  onChange={(event) => setFieldLabel(event.target.value)}
                  placeholder={dictionary.fieldEditor.labelPlaceholder}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  data-testid="field-required-checkbox"
                  type="checkbox"
                  checked={fieldRequired}
                  onChange={(event) => setFieldRequired(event.target.checked)}
                />
                {dictionary.fieldEditor.requiredCheckbox}
              </label>

              <div>
                <label
                  className="mb-1 block text-sm font-medium text-gray-700"
                  htmlFor="field-help-input"
                >
                  {dictionary.fieldEditor.helpLabel}
                </label>
                <input
                  id="field-help-input"
                  data-testid="field-help-input"
                  type="text"
                  value={fieldHelp}
                  onChange={(event) => setFieldHelp(event.target.value)}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label
                  className="mb-1 block text-sm font-medium text-gray-700"
                  htmlFor="field-description-input"
                >
                  {dictionary.fieldEditor.descriptionLabel}
                </label>
                <textarea
                  id="field-description-input"
                  data-testid="field-description-input"
                  value={fieldDescription}
                  onChange={(event) => setFieldDescription(event.target.value)}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                  rows={2}
                />
              </div>

              {isChoiceFieldType(fieldType) && (
                <div>
                  <p className="mb-1 text-sm font-medium text-gray-700">
                    {dictionary.fieldEditor.optionsHeading}
                  </p>
                  <div className="space-y-2">
                    {fieldOptions.map((option) => (
                      <div key={option.key} className="flex items-center gap-2">
                        <input
                          data-testid="field-option-input"
                          type="text"
                          value={option.value}
                          onChange={(event) =>
                            updateOption(option.key, event.target.value)
                          }
                          placeholder={dictionary.fieldEditor.optionPlaceholder}
                          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                        />
                        <button
                          type="button"
                          data-testid="remove-option-button"
                          onClick={() => removeOption(option.key)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          {dictionary.fieldEditor.removeOption}
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    data-testid="add-option-button"
                    onClick={addOption}
                    className="mt-2 text-xs font-medium text-blue-600 hover:underline"
                  >
                    + {dictionary.fieldEditor.addOption}
                  </button>
                </div>
              )}

              {fieldError && (
                <p className="text-sm text-red-600">{fieldError}</p>
              )}

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setFieldModalOpen(false)}
                  className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  {dictionary.fieldEditor.cancel}
                </button>
                <button
                  type="button"
                  data-testid="save-field-button"
                  disabled={savingField || !fieldLabel.trim()}
                  onClick={handleSaveField}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {dictionary.fieldEditor.save}
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
