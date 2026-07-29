"use client";

import type { Field } from "@/lib/fields";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Phase } from "@/lib/phases";
import {
  CARD_ATTRIBUTE_FIELD_IDS,
  type ReportFilterGroup,
  type ReportFilterOperator,
} from "@/lib/report-types";
import type { Report, ReportResults } from "@/lib/reports";
import * as Dialog from "@radix-ui/react-dialog";
import * as Popover from "@radix-ui/react-popover";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const DEFAULT_COLUMNS = ["_title", "_currentPhase", "_createdAt"];
const VALUE_LESS_OPERATORS: ReportFilterOperator[] = ["is_unknown", "exists"];

interface FieldOption {
  id: string;
  label: string;
}

interface FieldGroup {
  heading: string;
  fields: FieldOption[];
}

export function ReportBuilder({
  pipeId,
  phases,
  startFormFields,
  phaseFieldsByPhase,
  dictionary,
  report,
  initialResults,
}: {
  pipeId: string;
  phases: Phase[];
  startFormFields: Field[];
  phaseFieldsByPhase: Record<string, Field[]>;
  dictionary: Dictionary;
  report?: Report;
  initialResults?: ReportResults;
}) {
  const router = useRouter();
  const b = dictionary.reports.builder;
  const isSaved = Boolean(report);

  function cardAttributeLabel(id: (typeof CARD_ATTRIBUTE_FIELD_IDS)[number]) {
    switch (id) {
      case "_title":
        return b.cardAttributes.title;
      case "_currentPhase":
        return b.cardAttributes.currentPhase;
      case "_createdAt":
        return b.cardAttributes.createdAt;
      case "_updatedAt":
        return b.cardAttributes.updatedAt;
      default:
        return b.cardAttributes.done;
    }
  }

  const fieldGroups: FieldGroup[] = [
    {
      heading: b.fieldGroupCardAttributes,
      fields: [
        ...CARD_ATTRIBUTE_FIELD_IDS.map((id) => ({
          id,
          label: cardAttributeLabel(id),
        })),
        ...startFormFields.map((f) => ({ id: f.id, label: f.label })),
      ],
    },
    ...phases.map((phase) => ({
      heading: b.fieldGroupPhase.replace("{phase}", phase.name),
      fields: (phaseFieldsByPhase[phase.id] ?? []).map((f) => ({
        id: f.id,
        label: f.label,
      })),
    })),
  ];

  const allFieldOptions = fieldGroups.flatMap((g) => g.fields);

  function labelFor(fieldId: string): string {
    return allFieldOptions.find((f) => f.id === fieldId)?.label ?? fieldId;
  }

  const [filters, setFilters] = useState<ReportFilterGroup[]>(
    (report?.filters as ReportFilterGroup[] | undefined) ?? [],
  );
  const [visibleColumnFieldIds, setVisibleColumnFieldIds] = useState<string[]>(
    (report?.visibleColumnFieldIds as string[] | undefined) ?? DEFAULT_COLUMNS,
  );

  const [fieldPickerOpen, setFieldPickerOpen] = useState(false);
  const [fieldSearch, setFieldSearch] = useState("");
  const [pendingFieldId, setPendingFieldId] = useState<string | null>(null);
  const [pendingOperator, setPendingOperator] =
    useState<ReportFilterOperator>("is");
  const [pendingValue, setPendingValue] = useState("");

  const [columnPickerOpen, setColumnPickerOpen] = useState(false);

  const [results, setResults] = useState<ReportResults | null>(
    initialResults ?? null,
  );
  const [loading, setLoading] = useState(!initialResults);

  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [name, setName] = useState(report?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/pipes/${pipeId}/reports/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filters }),
    })
      .then((r) => r.json())
      .then((body) => {
        if (!cancelled) {
          setResults(body.results as ReportResults);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Re-run the live query whenever the filter set changes — a report is
    // never a frozen snapshot, even mid-edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pipeId]);

  function openFieldPicker() {
    setFieldSearch("");
    setPendingFieldId(null);
    setPendingValue("");
    setPendingOperator("is");
    setFieldPickerOpen((open) => !open);
  }

  function pickField(fieldId: string) {
    setPendingFieldId(fieldId);
    setFieldPickerOpen(false);
  }

  function applyPendingFilter() {
    if (!pendingFieldId) return;
    const needsValue = !VALUE_LESS_OPERATORS.includes(pendingOperator);
    if (needsValue && !pendingValue.trim()) return;

    setFilters((prev) => {
      const next = prev.length === 0 ? [[]] : prev.map((g) => [...g]);
      next[next.length - 1] = [
        ...next[next.length - 1],
        {
          fieldId: pendingFieldId,
          operator: pendingOperator,
          value: needsValue ? pendingValue : "",
        },
      ];
      return next;
    });
    setPendingFieldId(null);
    setPendingValue("");
    setPendingOperator("is");
  }

  function removeFilter(groupIndex: number, checkIndex: number) {
    setFilters((prev) => {
      const next = prev.map((g) => [...g]);
      next[groupIndex].splice(checkIndex, 1);
      return next.filter((g) => g.length > 0);
    });
  }

  function addOrGroup() {
    setFilters((prev) => [...prev, []]);
  }

  function toggleColumn(fieldId: string) {
    setVisibleColumnFieldIds((prev) =>
      prev.includes(fieldId)
        ? prev.filter((id) => id !== fieldId)
        : [...prev, fieldId],
    );
  }

  async function handleSaveNew() {
    if (!name.trim()) {
      setError(b.requiredError);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/pipes/${pipeId}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, filters, visibleColumnFieldIds }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to save report");
      }
      router.push(`/pipes/${pipeId}/reports_v2/${body.report.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save report");
      setSaving(false);
    }
  }

  async function handleSaveExisting() {
    if (!report) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters, visibleColumnFieldIds }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to save report");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save report");
    } finally {
      setSaving(false);
    }
  }

  const rows = results?.rows ?? [];

  return (
    <div className="p-6" data-testid="report-builder">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          {isSaved ? report?.name : b.heading}
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="columns-button"
            onClick={() => setColumnPickerOpen((open) => !open)}
            title={b.columnsButton}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            {b.columnsButton}
          </button>
          <button
            type="button"
            data-testid="formulas-button"
            disabled
            title={b.formulasDisabledTooltip}
            className="cursor-not-allowed rounded-md border border-gray-100 px-3 py-1.5 text-sm text-gray-300"
          >
            {b.formulasButton}
          </button>
          <button
            type="button"
            data-testid="save-report-button"
            disabled={saving}
            onClick={() =>
              isSaved ? handleSaveExisting() : setNameModalOpen(true)
            }
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {b.saveButton}
          </button>
        </div>
      </div>

      {columnPickerOpen && (
        <div
          data-testid="column-picker"
          className="mb-4 max-h-64 w-72 overflow-y-auto rounded-md border border-gray-200 bg-white p-3 shadow-sm"
        >
          <p className="mb-2 text-xs font-semibold uppercase text-gray-400">
            {b.columnPickerHeading}
          </p>
          {fieldGroups.map((group) => (
            <div key={group.heading} className="mb-2">
              <p className="mb-1 text-xs font-medium text-gray-500">
                {group.heading}
              </p>
              {group.fields.map((field) => (
                <label
                  key={field.id}
                  className="flex items-center gap-2 rounded px-1 py-0.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    data-testid={`column-toggle-${field.id}`}
                    checked={visibleColumnFieldIds.includes(field.id)}
                    onChange={() => toggleColumn(field.id)}
                  />
                  {field.label}
                </label>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="mb-4 rounded-md border border-gray-200 bg-white p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {filters.map((group, groupIndex) => (
            <span
              key={`group-${groupIndex.toString()}`}
              className="flex flex-wrap items-center gap-1.5"
            >
              {groupIndex > 0 && (
                <span className="text-xs font-semibold uppercase text-gray-400">
                  {b.addOrGroup}
                </span>
              )}
              {group.map((check, checkIndex) => (
                <span
                  key={`${check.fieldId}-${checkIndex.toString()}`}
                  className="flex items-center gap-1"
                >
                  {checkIndex > 0 && (
                    <span className="text-xs text-gray-400">
                      {b.andConnector}
                    </span>
                  )}
                  <span
                    data-testid="filter-chip"
                    className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700"
                  >
                    {labelFor(check.fieldId)} {b.operators[check.operator]}{" "}
                    {check.value}
                    <button
                      type="button"
                      data-testid="remove-filter-chip"
                      aria-label={b.removeFilter}
                      onClick={() => removeFilter(groupIndex, checkIndex)}
                      className="text-blue-400 hover:text-blue-700"
                    >
                      ×
                    </button>
                  </span>
                </span>
              ))}
            </span>
          ))}

          <Popover.Root
            open={fieldPickerOpen}
            onOpenChange={setFieldPickerOpen}
          >
            <Popover.Trigger asChild>
              <button
                type="button"
                data-testid="add-filter-button"
                onClick={openFieldPicker}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                + {b.addFilterButton}
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                data-testid="field-picker"
                className="z-10 max-h-72 w-64 overflow-y-auto rounded-md border border-gray-200 bg-white p-2 shadow-lg"
              >
                <input
                  type="text"
                  data-testid="field-picker-search"
                  value={fieldSearch}
                  onChange={(event) => setFieldSearch(event.target.value)}
                  placeholder={b.fieldGroupGeneral}
                  className="mb-2 w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                />
                {fieldGroups.map((group) => {
                  const filtered = group.fields.filter((f) =>
                    f.label
                      .toLowerCase()
                      .includes(fieldSearch.trim().toLowerCase()),
                  );
                  if (filtered.length === 0) return null;
                  return (
                    <div key={group.heading}>
                      <p className="mb-1 mt-2 text-xs font-semibold uppercase text-gray-400">
                        {group.heading}
                      </p>
                      {filtered.map((field) => (
                        <button
                          key={field.id}
                          type="button"
                          data-testid={`field-option-${field.id}`}
                          onClick={() => pickField(field.id)}
                          className="block w-full rounded px-2 py-1 text-left text-xs text-gray-700 hover:bg-blue-50"
                        >
                          {field.label}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>

        {pendingFieldId && (
          <div
            data-testid="pending-filter-config"
            className="flex flex-wrap items-center gap-2 rounded-md bg-gray-50 p-2"
          >
            <span className="text-sm font-medium text-gray-700">
              {labelFor(pendingFieldId)}
            </span>
            <div className="flex flex-wrap gap-2 text-xs">
              {(
                [
                  "is",
                  "is_not",
                  "contains",
                  "not_contains",
                  "is_unknown",
                  "exists",
                ] as ReportFilterOperator[]
              ).map((operator) => (
                <label key={operator} className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="filter-operator"
                    data-testid={`operator-${operator}`}
                    checked={pendingOperator === operator}
                    onChange={() => setPendingOperator(operator)}
                  />
                  {b.operators[operator]}
                </label>
              ))}
            </div>
            {!VALUE_LESS_OPERATORS.includes(pendingOperator) && (
              <input
                type="text"
                data-testid="filter-value-input"
                value={pendingValue}
                onChange={(event) => setPendingValue(event.target.value)}
                placeholder={b.valuePlaceholder}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs"
              />
            )}
            <button
              type="button"
              data-testid="apply-filter-button"
              onClick={applyPendingFilter}
              className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
            >
              {b.applyFilter}
            </button>
          </div>
        )}

        <button
          type="button"
          data-testid="add-or-group-button"
          onClick={addOrGroup}
          className="mt-2 block text-xs font-medium text-gray-500 hover:text-gray-700"
        >
          + {b.addOrGroup}
        </button>
      </div>

      <table
        className="w-full text-left text-sm"
        data-testid="report-results-table"
      >
        <thead>
          <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
            {visibleColumnFieldIds.map((fieldId) => (
              <th key={fieldId} className="py-2">
                {labelFor(fieldId)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              data-testid="report-result-row"
              className="border-b border-gray-100"
            >
              {visibleColumnFieldIds.map((fieldId) => (
                <td key={fieldId} className="py-2 text-gray-700">
                  {row.values[fieldId] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {!loading && rows.length === 0 && (
        <p
          data-testid="report-no-results"
          className="mt-3 text-sm text-gray-500"
        >
          {b.noResults}
        </p>
      )}

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      <Link
        href={`/pipes/${pipeId}/reports_v2`}
        className="mt-6 inline-block text-sm text-blue-600 hover:underline"
      >
        ← {dictionary.reports.backToList}
      </Link>

      <Dialog.Root open={nameModalOpen} onOpenChange={setNameModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/30" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-96 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-5 shadow-xl">
            <Dialog.Title className="mb-3 text-sm font-semibold text-gray-900">
              {b.saveModalTitle}
            </Dialog.Title>
            <input
              data-testid="report-name-input"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={b.namePlaceholder}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
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
                data-testid="confirm-save-report-button"
                disabled={saving}
                onClick={handleSaveNew}
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
