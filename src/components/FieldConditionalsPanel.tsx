"use client";

import {
  type ConditionCheck,
  type ConditionGroup,
  type ConditionalAction,
  type ConditionalActionType,
  type ConditionalOperator,
  FIELD_CONDITIONAL_ACTIONS,
  FIELD_CONDITIONAL_OPERATORS,
} from "@/lib/field-conditional-types";
import type { FieldConditional } from "@/lib/field-conditionals";
import type { Field } from "@/lib/fields";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";

function emptyCondition(fields: Field[]): ConditionCheck {
  return { fieldId: fields[0]?.id ?? "", operator: "equals", value: "" };
}

function emptyAction(fields: Field[]): ConditionalAction {
  return { action: "hide", targetFieldId: fields[0]?.id ?? "" };
}

function summarizeGroups(
  groups: ConditionGroup[],
  fields: Field[],
  dictionary: Dictionary,
): string {
  const fieldLabel = (id: string) =>
    fields.find((f) => f.id === id)?.label ?? id;
  return groups
    .map((group) =>
      group
        .map(
          (check) =>
            `${fieldLabel(check.fieldId)} ${dictionary.fieldConditionals.operators[check.operator]}${
              check.operator === "is_empty" || check.operator === "is_not_empty"
                ? ""
                : ` "${check.value}"`
            }`,
        )
        .join(" AND "),
    )
    .join(" OR ");
}

function summarizeActions(
  actions: ConditionalAction[],
  fields: Field[],
  dictionary: Dictionary,
): string {
  const fieldLabel = (id: string) =>
    fields.find((f) => f.id === id)?.label ?? id;
  return actions
    .map(
      (action) =>
        `${dictionary.fieldConditionals.actions[action.action]} ${fieldLabel(action.targetFieldId)}`,
    )
    .join(", ");
}

export function FieldConditionalsPanel({
  phaseId,
  fields,
  initialConditionals,
  dictionary,
}: {
  phaseId: string;
  fields: Field[];
  initialConditionals: FieldConditional[];
  dictionary: Dictionary;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [conditionals, setConditionals] = useState(initialConditionals);
  const [search, setSearch] = useState("");
  const [fieldFilter, setFieldFilter] = useState("");

  const [builderOpen, setBuilderOpen] = useState(false);
  const [name, setName] = useState("");
  const [groups, setGroups] = useState<ConditionGroup[]>([
    [emptyCondition(fields)],
  ]);
  const [trueActions, setTrueActions] = useState<ConditionalAction[]>([
    emptyAction(fields),
  ]);
  const [falseActions, setFalseActions] = useState<ConditionalAction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const t = dictionary.fieldConditionals;

  async function refresh() {
    const response = await fetch(`/api/phases/${phaseId}/field-conditionals`);
    if (response.ok) {
      const body = await response.json();
      setConditionals(body.fieldConditionals as FieldConditional[]);
    }
  }

  function openBuilder() {
    setName("");
    setGroups([[emptyCondition(fields)]]);
    setTrueActions([emptyAction(fields)]);
    setFalseActions([]);
    setError(null);
    setBuilderOpen(true);
  }

  function updateCondition(
    groupIndex: number,
    conditionIndex: number,
    patch: Partial<ConditionCheck>,
  ) {
    setGroups((prev) =>
      prev.map((group, gi) =>
        gi !== groupIndex
          ? group
          : group.map((condition, ci) =>
              ci !== conditionIndex ? condition : { ...condition, ...patch },
            ),
      ),
    );
  }

  function addConditionToGroup(groupIndex: number) {
    setGroups((prev) =>
      prev.map((group, gi) =>
        gi !== groupIndex ? group : [...group, emptyCondition(fields)],
      ),
    );
  }

  function addGroup() {
    setGroups((prev) => [...prev, [emptyCondition(fields)]]);
  }

  function updateAction(
    branch: "true" | "false",
    index: number,
    patch: Partial<ConditionalAction>,
  ) {
    const setter = branch === "true" ? setTrueActions : setFalseActions;
    setter((prev) =>
      prev.map((action, i) => (i !== index ? action : { ...action, ...patch })),
    );
  }

  function addAction(branch: "true" | "false") {
    const setter = branch === "true" ? setTrueActions : setFalseActions;
    setter((prev) => [...prev, emptyAction(fields)]);
  }

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError(t.requiredError);
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(
        `/api/phases/${phaseId}/field-conditionals`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            conditionGroups: groups,
            trueActions,
            falseActions,
          }),
        },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save conditional");
      }
      setBuilderOpen(false);
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save conditional",
      );
    } finally {
      setSaving(false);
    }
  }

  const visibleConditionals = conditionals.filter((conditional) => {
    if (
      search &&
      !conditional.name.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    if (fieldFilter) {
      const touchesField = conditional.conditionGroups.some((group) =>
        group.some((check) => check.fieldId === fieldFilter),
      );
      const targetsField = [
        ...conditional.trueActions,
        ...conditional.falseActions,
      ].some((action) => action.targetFieldId === fieldFilter);
      if (!touchesField && !targetsField) return false;
    }
    return true;
  });

  return (
    <>
      <button
        type="button"
        data-testid="field-conditionals-button"
        onClick={() => setPanelOpen(true)}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        {t.openButton}
      </button>

      <Dialog.Root open={panelOpen} onOpenChange={setPanelOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40" />
          <Dialog.Content
            data-testid="field-conditionals-panel"
            className="fixed top-1/2 left-1/2 max-h-[85vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <Dialog.Title className="text-lg font-semibold text-gray-900">
                {t.heading}
              </Dialog.Title>
              <Dialog.Close className="text-gray-400 hover:text-gray-600">
                ✕
              </Dialog.Close>
            </div>

            <div className="mb-3 flex gap-2">
              <input
                data-testid="field-conditionals-search-input"
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t.searchPlaceholder}
                className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm"
              />
              <select
                data-testid="field-conditionals-field-filter"
                value={fieldFilter}
                onChange={(event) => setFieldFilter(event.target.value)}
                className="rounded-md border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">
                  {t.fieldFilterLabel}: {t.filterAll}
                </option>
                {fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.label}
                  </option>
                ))}
              </select>
            </div>

            <p
              data-testid="field-conditionals-banner"
              className="mb-4 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-800"
            >
              {t.banner}
            </p>

            {visibleConditionals.length === 0 ? (
              <p
                data-testid="field-conditionals-empty"
                className="mb-4 text-sm text-gray-400"
              >
                {t.emptyState}
              </p>
            ) : (
              <ul className="mb-4 space-y-2">
                {visibleConditionals.map((conditional) => (
                  <li
                    key={conditional.id}
                    data-testid="conditional-row"
                    className="rounded-md border border-gray-200 bg-white px-3 py-2"
                  >
                    <p className="text-sm font-medium text-gray-800">
                      {conditional.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {summarizeGroups(
                        conditional.conditionGroups,
                        fields,
                        dictionary,
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t.thenDo}:{" "}
                      {summarizeActions(
                        conditional.trueActions,
                        fields,
                        dictionary,
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              data-testid="create-conditional-button"
              onClick={openBuilder}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + {t.createButton}
            </button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={builderOpen} onOpenChange={setBuilderOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40" />
          <Dialog.Content
            data-testid="conditional-builder-modal"
            className="fixed top-1/2 left-1/2 max-h-[85vh] w-full max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <Dialog.Title className="text-lg font-semibold text-gray-900">
                {t.createModalTitle}
              </Dialog.Title>
              <Dialog.Close className="text-gray-400 hover:text-gray-600">
                ✕
              </Dialog.Close>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  className="mb-1 block text-sm font-medium text-gray-700"
                  htmlFor="conditional-name-input"
                >
                  {t.nameLabel}
                </label>
                <input
                  id="conditional-name-input"
                  data-testid="conditional-name-input"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t.namePlaceholder}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">
                  {t.conditionsHeading}
                </p>
                <div className="space-y-3">
                  {groups.map((group, groupIndex) => (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: groups are reordered only by append
                      key={groupIndex}
                      data-testid="condition-group"
                      className="rounded-md border border-gray-200 p-2"
                    >
                      {groupIndex > 0 && (
                        <p className="mb-1 text-[10px] font-semibold uppercase text-gray-400">
                          OR
                        </p>
                      )}
                      <div className="space-y-2">
                        {group.map((condition, conditionIndex) => (
                          <div
                            // biome-ignore lint/suspicious/noArrayIndexKey: conditions are reordered only by append
                            key={conditionIndex}
                            className="flex flex-wrap items-center gap-2"
                          >
                            <select
                              data-testid="condition-field-select"
                              value={condition.fieldId}
                              onChange={(event) =>
                                updateCondition(groupIndex, conditionIndex, {
                                  fieldId: event.target.value,
                                })
                              }
                              className="rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                            >
                              <option value="">
                                {t.selectFieldPlaceholder}
                              </option>
                              {fields.map((field) => (
                                <option key={field.id} value={field.id}>
                                  {field.label}
                                </option>
                              ))}
                            </select>
                            <select
                              data-testid="condition-operator-select"
                              value={condition.operator}
                              onChange={(event) =>
                                updateCondition(groupIndex, conditionIndex, {
                                  operator: event.target
                                    .value as ConditionalOperator,
                                })
                              }
                              className="rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                            >
                              {FIELD_CONDITIONAL_OPERATORS.map((operator) => (
                                <option key={operator} value={operator}>
                                  {t.operators[operator]}
                                </option>
                              ))}
                            </select>
                            {condition.operator !== "is_empty" &&
                              condition.operator !== "is_not_empty" && (
                                <input
                                  data-testid="condition-value-input"
                                  type="text"
                                  value={condition.value}
                                  onChange={(event) =>
                                    updateCondition(
                                      groupIndex,
                                      conditionIndex,
                                      { value: event.target.value },
                                    )
                                  }
                                  placeholder={t.valuePlaceholder}
                                  className="rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                                />
                              )}
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        data-testid="add-condition-button"
                        onClick={() => addConditionToGroup(groupIndex)}
                        className="mt-2 text-xs font-medium text-blue-600 hover:underline"
                      >
                        + {t.addCondition}
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  data-testid="add-condition-group-button"
                  onClick={addGroup}
                  className="mt-2 text-xs font-medium text-blue-600 hover:underline"
                >
                  + {t.addGroup}
                </button>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">
                  {t.whenTrueHeading}
                </p>
                <div className="space-y-2">
                  {trueActions.map((action, index) => (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: actions are reordered only by append
                      key={index}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <select
                        data-testid="true-action-select"
                        value={action.action}
                        onChange={(event) =>
                          updateAction("true", index, {
                            action: event.target.value as ConditionalActionType,
                          })
                        }
                        className="rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                      >
                        {FIELD_CONDITIONAL_ACTIONS.map((actionType) => (
                          <option key={actionType} value={actionType}>
                            {t.actions[actionType]}
                          </option>
                        ))}
                      </select>
                      <select
                        data-testid="true-action-target-select"
                        value={action.targetFieldId}
                        onChange={(event) =>
                          updateAction("true", index, {
                            targetFieldId: event.target.value,
                          })
                        }
                        className="rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                      >
                        <option value="">{t.targetFieldLabel}</option>
                        {fields.map((field) => (
                          <option key={field.id} value={field.id}>
                            {field.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  data-testid="add-true-action-button"
                  onClick={() => addAction("true")}
                  className="mt-2 text-xs font-medium text-blue-600 hover:underline"
                >
                  + {t.addAction}
                </button>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">
                  {t.whenFalseHeading}
                </p>
                <div className="space-y-2">
                  {falseActions.map((action, index) => (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: actions are reordered only by append
                      key={index}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <select
                        data-testid="false-action-select"
                        value={action.action}
                        onChange={(event) =>
                          updateAction("false", index, {
                            action: event.target.value as ConditionalActionType,
                          })
                        }
                        className="rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                      >
                        {FIELD_CONDITIONAL_ACTIONS.map((actionType) => (
                          <option key={actionType} value={actionType}>
                            {t.actions[actionType]}
                          </option>
                        ))}
                      </select>
                      <select
                        data-testid="false-action-target-select"
                        value={action.targetFieldId}
                        onChange={(event) =>
                          updateAction("false", index, {
                            targetFieldId: event.target.value,
                          })
                        }
                        className="rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                      >
                        <option value="">{t.targetFieldLabel}</option>
                        {fields.map((field) => (
                          <option key={field.id} value={field.id}>
                            {field.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  data-testid="add-false-action-button"
                  onClick={() => addAction("false")}
                  className="mt-2 text-xs font-medium text-blue-600 hover:underline"
                >
                  + {t.addAction}
                </button>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setBuilderOpen(false)}
                  className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  data-testid="save-conditional-button"
                  disabled={saving || !name.trim()}
                  onClick={handleSave}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t.save}
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
