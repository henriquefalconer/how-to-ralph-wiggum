"use client";

import {
  AUTOMATION_ACTION_TYPES,
  AUTOMATION_TRIGGER_TYPES,
  type AutomationActionType,
} from "@/lib/automation-types";
import type { Automation } from "@/lib/automations";
import type { Field } from "@/lib/fields";
import type { Dictionary } from "@/lib/i18n";
import type { Phase } from "@/lib/phases";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useState } from "react";

const IMPLEMENTED_TRIGGER = "card_entered_phase";
const IMPLEMENTED_ACTION: AutomationActionType = "update_field";

interface UpdateFieldConfig {
  targetFieldOwnerType: "start_form" | "phase";
  targetFieldOwnerId: string;
  targetFieldId: string;
  value: string;
}

export function AutomationBuilder({
  pipeId,
  phases,
  startFormFields,
  phaseFieldsByPhase,
  dictionary,
  automation,
}: {
  pipeId: string;
  phases: Phase[];
  startFormFields: Field[];
  phaseFieldsByPhase: Record<string, Field[]>;
  dictionary: Dictionary;
  automation?: Automation;
}) {
  const router = useRouter();
  const b = dictionary.automations.builder;
  const isEdit = Boolean(automation);

  const initialTriggerConfig = (automation?.triggerConfig ?? {}) as {
    phaseId?: string;
  };
  const initialActionConfig = (automation?.actionConfig ??
    {}) as Partial<UpdateFieldConfig>;

  const [selectedTrigger, setSelectedTrigger] = useState<string | null>(
    automation?.triggerType ?? null,
  );
  const [selectedAction, setSelectedAction] = useState<string | null>(
    automation?.actionType ?? null,
  );
  const [triggerPhaseId, setTriggerPhaseId] = useState(
    initialTriggerConfig.phaseId ?? "",
  );
  const [fieldOwnerType, setFieldOwnerType] = useState<"start_form" | "phase">(
    initialActionConfig.targetFieldOwnerType ?? "start_form",
  );
  const [fieldOwnerPhaseId, setFieldOwnerPhaseId] = useState(
    initialActionConfig.targetFieldOwnerType === "phase"
      ? (initialActionConfig.targetFieldOwnerId ?? "")
      : "",
  );
  const [fieldId, setFieldId] = useState(
    initialActionConfig.targetFieldId ?? "",
  );
  const [value, setValue] = useState(initialActionConfig.value ?? "");
  const [tokenPickerOpen, setTokenPickerOpen] = useState(false);

  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [name, setName] = useState(automation?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const availableFields =
    fieldOwnerType === "start_form"
      ? startFormFields
      : (phaseFieldsByPhase[fieldOwnerPhaseId] ?? []);

  const targetFieldOwnerId =
    fieldOwnerType === "start_form" ? pipeId : fieldOwnerPhaseId;

  const canSave =
    selectedTrigger === IMPLEMENTED_TRIGGER &&
    Boolean(triggerPhaseId) &&
    selectedAction === IMPLEMENTED_ACTION &&
    Boolean(targetFieldOwnerId) &&
    Boolean(fieldId);

  async function handleSave() {
    if (!name.trim()) {
      setError(b.requiredError);
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      name,
      enabled: automation?.enabled ?? true,
      triggerType: IMPLEMENTED_TRIGGER,
      triggerConfig: { phaseId: triggerPhaseId },
      actionType: IMPLEMENTED_ACTION,
      actionConfig: {
        targetFieldOwnerType: fieldOwnerType,
        targetFieldOwnerId,
        targetFieldId: fieldId,
        value,
      },
    };

    try {
      const response = await fetch(
        isEdit
          ? `/api/automations/${automation?.id}`
          : `/api/pipes/${pipeId}/automations`,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to save automation");
      }
      router.push(`/pipes/${pipeId}/automations`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save automation",
      );
      setSaving(false);
    }
  }

  function insertToken(token: string) {
    setValue((prev) => `${prev}{{${token}}}`);
    setTokenPickerOpen(false);
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-xl font-semibold text-gray-900">{b.heading}</h1>

      <div className="grid grid-cols-2 gap-6">
        <section data-testid="trigger-column">
          <h2 className="mb-3 text-sm font-semibold uppercase text-gray-500">
            {b.triggerColumnHeading}
          </h2>
          <div className="space-y-1.5">
            {AUTOMATION_TRIGGER_TYPES.map((trigger) => {
              const implemented = trigger === IMPLEMENTED_TRIGGER;
              return (
                <button
                  key={trigger}
                  type="button"
                  data-testid={`trigger-${trigger}`}
                  disabled={!implemented}
                  title={implemented ? undefined : b.comingSoon}
                  onClick={() => setSelectedTrigger(trigger)}
                  className={`block w-full rounded-md border px-3 py-2 text-left text-sm ${
                    selectedTrigger === trigger
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : implemented
                        ? "border-gray-200 text-gray-700 hover:border-blue-300"
                        : "cursor-not-allowed border-gray-100 text-gray-300"
                  }`}
                >
                  {b.triggers[trigger]}
                </button>
              );
            })}
          </div>

          {selectedTrigger === IMPLEMENTED_TRIGGER && (
            <div
              data-testid="trigger-config-card"
              className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3"
            >
              <label
                htmlFor="trigger-phase-select"
                className="mb-1 block text-xs font-medium text-gray-600"
              >
                {b.phaseLabel}
              </label>
              <select
                id="trigger-phase-select"
                data-testid="trigger-phase-select"
                value={triggerPhaseId}
                onChange={(event) => setTriggerPhaseId(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value="">—</option>
                {phases.map((phase) => (
                  <option key={phase.id} value={phase.id}>
                    {phase.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>

        <section data-testid="action-column">
          <h2 className="mb-3 text-sm font-semibold uppercase text-gray-500">
            {b.actionColumnHeading}
          </h2>
          <div className="space-y-1.5">
            {AUTOMATION_ACTION_TYPES.map((action) => {
              const implemented = action === IMPLEMENTED_ACTION;
              return (
                <button
                  key={action}
                  type="button"
                  data-testid={`action-${action}`}
                  disabled={!implemented}
                  title={implemented ? undefined : b.comingSoon}
                  onClick={() => setSelectedAction(action)}
                  className={`block w-full rounded-md border px-3 py-2 text-left text-sm ${
                    selectedAction === action
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : implemented
                        ? "border-gray-200 text-gray-700 hover:border-blue-300"
                        : "cursor-not-allowed border-gray-100 text-gray-300"
                  }`}
                >
                  {b.actions[action]}
                </button>
              );
            })}
          </div>

          {selectedAction === IMPLEMENTED_ACTION && (
            <div
              data-testid="action-config-card"
              className="mt-3 space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3"
            >
              <div>
                <span className="mb-1 block text-xs font-medium text-gray-600">
                  {b.fieldOwnerLabel}
                </span>
                <div className="flex gap-3 text-sm">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      checked={fieldOwnerType === "start_form"}
                      onChange={() => {
                        setFieldOwnerType("start_form");
                        setFieldId("");
                      }}
                    />
                    {b.fieldOwnerStartForm}
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      checked={fieldOwnerType === "phase"}
                      onChange={() => {
                        setFieldOwnerType("phase");
                        setFieldId("");
                      }}
                    />
                    {b.fieldOwnerPhase}
                  </label>
                </div>
              </div>

              {fieldOwnerType === "phase" && (
                <select
                  data-testid="action-phase-select"
                  value={fieldOwnerPhaseId}
                  onChange={(event) => {
                    setFieldOwnerPhaseId(event.target.value);
                    setFieldId("");
                  }}
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                >
                  <option value="">—</option>
                  {phases.map((phase) => (
                    <option key={phase.id} value={phase.id}>
                      {phase.name}
                    </option>
                  ))}
                </select>
              )}

              <div>
                <label
                  htmlFor="action-field-select"
                  className="mb-1 block text-xs font-medium text-gray-600"
                >
                  {b.fieldLabel}
                </label>
                <select
                  id="action-field-select"
                  data-testid="action-field-select"
                  value={fieldId}
                  onChange={(event) => setFieldId(event.target.value)}
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                >
                  <option value="">—</option>
                  {availableFields.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label
                  htmlFor="action-value-input"
                  className="mb-1 block text-xs font-medium text-gray-600"
                >
                  {b.valueLabel}
                </label>
                <div className="flex gap-1.5">
                  <input
                    id="action-value-input"
                    data-testid="action-value-input"
                    type="text"
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    placeholder={b.valuePlaceholder}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    data-testid="insert-token-button"
                    onClick={() => setTokenPickerOpen((open) => !open)}
                    title={b.insertToken}
                    className="rounded-md border border-gray-300 px-2 text-sm text-gray-600 hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>

                {tokenPickerOpen && (
                  <div
                    data-testid="token-picker"
                    className="absolute z-10 mt-1 max-h-64 w-64 overflow-y-auto rounded-md border border-gray-200 bg-white p-2 shadow-lg"
                  >
                    <p className="mb-1 text-xs font-semibold uppercase text-gray-400">
                      {b.tokenGroupStartForm}
                    </p>
                    {startFormFields.map((field) => (
                      <button
                        key={field.id}
                        type="button"
                        data-testid={`token-start_form-${field.id}`}
                        onClick={() => insertToken(`start_form.${field.id}`)}
                        className="block w-full rounded px-2 py-1 text-left text-xs text-gray-700 hover:bg-blue-50"
                      >
                        {field.label}
                      </button>
                    ))}
                    {phases.map((phase) => (
                      <div key={phase.id}>
                        <p className="mb-1 mt-2 text-xs font-semibold uppercase text-gray-400">
                          {b.tokenGroupPhase.replace("{phase}", phase.name)}
                        </p>
                        {(phaseFieldsByPhase[phase.id] ?? []).map((field) => (
                          <button
                            key={field.id}
                            type="button"
                            data-testid={`token-${phase.id}-${field.id}`}
                            onClick={() =>
                              insertToken(`${phase.id}.${field.id}`)
                            }
                            className="block w-full rounded px-2 py-1 text-left text-xs text-gray-700 hover:bg-blue-50"
                          >
                            {field.label}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="mt-6">
        <button
          type="button"
          data-testid="open-name-modal-button"
          disabled={!canSave}
          onClick={() => setNameModalOpen(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isEdit ? b.save : b.createAutomation}
        </button>
      </div>

      <Dialog.Root open={nameModalOpen} onOpenChange={setNameModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/30" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-96 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-5 shadow-xl">
            <Dialog.Title className="mb-3 text-sm font-semibold text-gray-900">
              {b.nameModalTitle}
            </Dialog.Title>
            <input
              data-testid="automation-name-input"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={b.namePlaceholder}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNameModalOpen(false)}
                className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
              >
                {b.cancel}
              </button>
              <button
                type="button"
                data-testid="save-automation-button"
                disabled={saving}
                onClick={handleSave}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {b.save}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
