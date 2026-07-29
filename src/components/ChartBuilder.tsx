"use client";

import {
  type ChartDefaultLabels,
  DASHBOARD_CHART_METRICS,
  DASHBOARD_CHART_VIZ_TYPES,
  type DashboardChartMetric,
  type DashboardChartTimeGrouping,
  type DashboardChartVizType,
  deriveChartDefaults,
} from "@/lib/dashboard-types";
import type { ChartData, Dashboard, DashboardChart } from "@/lib/dashboards";
import type { Field } from "@/lib/fields";
import type { Dictionary } from "@/lib/i18n";
import type { Phase } from "@/lib/phases";
import {
  CARD_ATTRIBUTE_FIELD_IDS,
  type ReportFilterGroup,
  type ReportFilterOperator,
} from "@/lib/report-types";
import * as Dialog from "@radix-ui/react-dialog";
import * as Popover from "@radix-ui/react-popover";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChartTile } from "./ChartTile";

const VALUE_LESS_OPERATORS: ReportFilterOperator[] = ["is_unknown", "exists"];

interface FieldOption {
  id: string;
  label: string;
}
interface FieldGroup {
  heading: string;
  fields: FieldOption[];
}

export function ChartBuilder({
  pipeId,
  phases,
  startFormFields,
  phaseFieldsByPhase,
  dashboards,
  dictionary,
  chart,
  initialDashboardId,
}: {
  pipeId: string;
  phases: Phase[];
  startFormFields: Field[];
  phaseFieldsByPhase: Record<string, Field[]>;
  dashboards: Dashboard[];
  dictionary: Dictionary;
  chart?: DashboardChart;
  initialDashboardId?: string;
}) {
  const router = useRouter();
  const d = dictionary.dashboards;
  const b = d.builder;
  const rb = dictionary.reports.builder;
  const isSaved = Boolean(chart);

  const labels: ChartDefaultLabels = {
    metric: b.metrics,
    groupingSuffix: b.titleSuffixes,
  };

  function cardAttributeLabel(id: (typeof CARD_ATTRIBUTE_FIELD_IDS)[number]) {
    switch (id) {
      case "_title":
        return rb.cardAttributes.title;
      case "_currentPhase":
        return rb.cardAttributes.currentPhase;
      case "_createdAt":
        return rb.cardAttributes.createdAt;
      case "_updatedAt":
        return rb.cardAttributes.updatedAt;
      default:
        return rb.cardAttributes.done;
    }
  }

  const fieldGroups: FieldGroup[] = [
    {
      heading: rb.fieldGroupCardAttributes,
      fields: [
        ...CARD_ATTRIBUTE_FIELD_IDS.map((id) => ({
          id,
          label: cardAttributeLabel(id),
        })),
        ...startFormFields.map((f) => ({ id: f.id, label: f.label })),
      ],
    },
    ...phases.map((phase) => ({
      heading: rb.fieldGroupPhase.replace("{phase}", phase.name),
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

  const [title, setTitle] = useState(chart?.title ?? labels.metric.cards_total);
  const [metric, setMetric] = useState<DashboardChartMetric>(
    chart?.metric ?? "cards_total",
  );
  const [dimensionFieldId, setDimensionFieldId] = useState<string | null>(
    chart?.dimensionFieldId ?? null,
  );
  const [timeFieldId, setTimeFieldId] = useState(
    chart?.timeFieldId ?? "_createdAt",
  );
  const [timeRange, setTimeRange] = useState(chart?.timeRange ?? "all_time");
  const [timeGrouping, setTimeGrouping] =
    useState<DashboardChartTimeGrouping | null>(chart?.timeGrouping ?? null);
  const [vizType, setVizType] = useState<DashboardChartVizType>(
    chart?.vizType ?? "number",
  );
  const [filters, setFilters] = useState<ReportFilterGroup[]>(
    (chart?.filters as ReportFilterGroup[] | undefined) ?? [],
  );

  const [metricPickerOpen, setMetricPickerOpen] = useState(false);
  const [dimensionPickerOpen, setDimensionPickerOpen] = useState(false);
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false);
  const [pendingFieldId, setPendingFieldId] = useState<string | null>(null);
  const [pendingOperator, setPendingOperator] =
    useState<ReportFilterOperator>("is");
  const [pendingValue, setPendingValue] = useState("");

  const [data, setData] = useState<ChartData | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState(chart?.title ?? "");
  const [targetDashboardId, setTargetDashboardId] = useState(
    initialDashboardId ?? dashboards[0]?.id ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function applyDerived(
    patch: Partial<{
      metric: DashboardChartMetric;
      vizType: DashboardChartVizType;
      timeGrouping: DashboardChartTimeGrouping | null;
    }>,
  ) {
    const next = deriveChartDefaults(
      { title, metric, timeGrouping, vizType },
      patch,
      labels,
    );
    setTitle(next.title);
    setMetric(next.metric);
    setTimeGrouping(next.timeGrouping);
    setVizType(next.vizType);
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/pipes/${pipeId}/dashboards/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        metric,
        dimensionFieldId,
        timeFieldId,
        timeRange,
        timeGrouping,
        filters,
      }),
    })
      .then((r) => r.json())
      .then((body) => {
        if (!cancelled && body.data) setData(body.data as ChartData);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // Live preview re-queries on every config change — a chart is never a
    // frozen render, even while it's still being built.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pipeId,
    metric,
    dimensionFieldId,
    timeFieldId,
    timeRange,
    timeGrouping,
    filters,
  ]);

  function openFieldPicker() {
    setPendingFieldId(null);
    setPendingValue("");
    setPendingOperator("is");
    setFieldPickerOpen((open) => !open);
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
  }

  function removeFilter(groupIndex: number, checkIndex: number) {
    setFilters((prev) => {
      const next = prev.map((g) => [...g]);
      next[groupIndex].splice(checkIndex, 1);
      return next.filter((g) => g.length > 0);
    });
  }

  async function submitChart(dashboardId: string, chartTitle: string) {
    setSaving(true);
    setError(null);
    const payload = {
      title: chartTitle,
      metric,
      dimensionFieldId,
      timeFieldId,
      timeRange,
      timeGrouping,
      vizType,
      filters,
    };
    try {
      const response = isSaved
        ? await fetch(`/api/dashboard-charts/${chart?.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/dashboards/${dashboardId}/charts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to save chart");
      }
      router.push(`/pipes/${pipeId}/dashboards/${dashboardId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save chart");
      setSaving(false);
    }
  }

  function handleSaveClick() {
    if (isSaved && chart) {
      submitChart(chart.dashboardId, title);
      return;
    }
    setSaveName(title);
    setSaveModalOpen(true);
  }

  function handleConfirmSave() {
    if (!saveName.trim()) {
      setError(b.requiredError);
      return;
    }
    if (!targetDashboardId) {
      setError(b.requiredError);
      return;
    }
    submitChart(targetDashboardId, saveName.trim());
  }

  return (
    <div className="p-6" data-testid="chart-builder">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        <div className="flex items-center gap-2">
          <Link
            href={
              initialDashboardId
                ? `/pipes/${pipeId}/dashboards/${initialDashboardId}`
                : `/pipes/${pipeId}/dashboards`
            }
            className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            {b.cancel}
          </Link>
          <button
            type="button"
            data-testid="save-chart-button"
            disabled={saving}
            onClick={handleSaveClick}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {b.saveButton}
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 rounded-md border border-gray-200 bg-white p-3 sm:grid-cols-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-gray-400">
            {b.metricLabel}
          </p>
          <Popover.Root
            open={metricPickerOpen}
            onOpenChange={setMetricPickerOpen}
          >
            <Popover.Trigger asChild>
              <button
                type="button"
                data-testid="metric-picker-trigger"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                {b.metrics[metric]}
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                data-testid="metric-picker"
                className="z-10 max-h-72 w-64 overflow-y-auto rounded-md border border-gray-200 bg-white p-2 shadow-lg"
              >
                {DASHBOARD_CHART_METRICS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    data-testid={`metric-option-${m}`}
                    onClick={() => {
                      applyDerived({ metric: m });
                      setMetricPickerOpen(false);
                    }}
                    className="block w-full rounded px-2 py-1 text-left text-xs text-gray-700 hover:bg-blue-50"
                  >
                    {b.metrics[m]}
                  </button>
                ))}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-gray-400">
            {b.dimensionLabel}
          </p>
          <Popover.Root
            open={dimensionPickerOpen}
            onOpenChange={setDimensionPickerOpen}
          >
            <Popover.Trigger asChild>
              <button
                type="button"
                data-testid="dimension-picker-trigger"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                {dimensionFieldId ? labelFor(dimensionFieldId) : b.noDimension}
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                data-testid="dimension-picker"
                className="z-10 max-h-72 w-64 overflow-y-auto rounded-md border border-gray-200 bg-white p-2 shadow-lg"
              >
                <button
                  type="button"
                  data-testid="dimension-option-none"
                  onClick={() => {
                    setDimensionFieldId(null);
                    setDimensionPickerOpen(false);
                  }}
                  className="block w-full rounded px-2 py-1 text-left text-xs text-gray-500 hover:bg-blue-50"
                >
                  {b.noDimension}
                </button>
                {fieldGroups.map((group) => (
                  <div key={group.heading}>
                    <p className="mb-1 mt-2 text-xs font-semibold uppercase text-gray-400">
                      {group.heading}
                    </p>
                    {group.fields.map((field) => (
                      <button
                        key={field.id}
                        type="button"
                        data-testid={`dimension-option-${field.id}`}
                        onClick={() => {
                          setDimensionFieldId(field.id);
                          setDimensionPickerOpen(false);
                        }}
                        className="block w-full rounded px-2 py-1 text-left text-xs text-gray-700 hover:bg-blue-50"
                      >
                        {field.label}
                      </button>
                    ))}
                  </div>
                ))}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-gray-400">
            {b.timeGroupLabel}
          </p>
          <div className="flex gap-1.5">
            <select
              data-testid="time-field-select"
              value={timeFieldId}
              onChange={(e) => setTimeFieldId(e.target.value)}
              className="rounded-md border border-gray-300 px-1.5 py-1.5 text-xs text-gray-700"
            >
              <option value="_createdAt">{b.timeFieldCreatedAt}</option>
              <option value="_updatedAt">{b.timeFieldUpdatedAt}</option>
            </select>
            <select
              data-testid="time-range-select"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="rounded-md border border-gray-300 px-1.5 py-1.5 text-xs text-gray-700"
            >
              {Object.entries(b.timeRanges).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <select
              data-testid="time-grouping-select"
              value={timeGrouping ?? "none"}
              disabled={vizType === "number"}
              onChange={(e) =>
                applyDerived({
                  timeGrouping:
                    e.target.value === "none"
                      ? null
                      : (e.target.value as DashboardChartTimeGrouping),
                })
              }
              className="rounded-md border border-gray-300 px-1.5 py-1.5 text-xs text-gray-700 disabled:opacity-50"
            >
              <option value="none">{b.timeGroupings.none}</option>
              <option value="day">{b.timeGroupings.day}</option>
              <option value="week">{b.timeGroupings.week}</option>
              <option value="month">{b.timeGroupings.month}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-md border border-gray-200 bg-white p-3">
        <p className="mb-2 text-xs font-semibold uppercase text-gray-400">
          {b.filtersHeading}
        </p>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {filters.map((group, groupIndex) => (
            <span
              key={`group-${groupIndex.toString()}`}
              className="flex flex-wrap items-center gap-1.5"
            >
              {groupIndex > 0 && (
                <span className="text-xs font-semibold uppercase text-gray-400">
                  {rb.addOrGroup}
                </span>
              )}
              {group.map((check, checkIndex) => (
                <span
                  key={`${check.fieldId}-${checkIndex.toString()}`}
                  className="flex items-center gap-1"
                >
                  {checkIndex > 0 && (
                    <span className="text-xs text-gray-400">
                      {rb.andConnector}
                    </span>
                  )}
                  <span
                    data-testid="chart-filter-chip"
                    className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700"
                  >
                    {labelFor(check.fieldId)} {rb.operators[check.operator]}{" "}
                    {check.value}
                    <button
                      type="button"
                      data-testid="remove-chart-filter-chip"
                      aria-label={rb.removeFilter}
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
                data-testid="add-chart-filter-button"
                onClick={openFieldPicker}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                + {rb.addFilterButton}
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                data-testid="chart-field-picker"
                className="z-10 max-h-72 w-64 overflow-y-auto rounded-md border border-gray-200 bg-white p-2 shadow-lg"
              >
                {fieldGroups.map((group) => (
                  <div key={group.heading}>
                    <p className="mb-1 mt-2 text-xs font-semibold uppercase text-gray-400">
                      {group.heading}
                    </p>
                    {group.fields.map((field) => (
                      <button
                        key={field.id}
                        type="button"
                        data-testid={`chart-field-option-${field.id}`}
                        onClick={() => {
                          setPendingFieldId(field.id);
                          setFieldPickerOpen(false);
                        }}
                        className="block w-full rounded px-2 py-1 text-left text-xs text-gray-700 hover:bg-blue-50"
                      >
                        {field.label}
                      </button>
                    ))}
                  </div>
                ))}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>

        {pendingFieldId && (
          <div
            data-testid="pending-chart-filter-config"
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
                    name="chart-filter-operator"
                    data-testid={`chart-operator-${operator}`}
                    checked={pendingOperator === operator}
                    onChange={() => setPendingOperator(operator)}
                  />
                  {rb.operators[operator]}
                </label>
              ))}
            </div>
            {!VALUE_LESS_OPERATORS.includes(pendingOperator) && (
              <input
                type="text"
                data-testid="chart-filter-value-input"
                value={pendingValue}
                onChange={(e) => setPendingValue(e.target.value)}
                placeholder={rb.valuePlaceholder}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs"
              />
            )}
            <button
              type="button"
              data-testid="apply-chart-filter-button"
              onClick={applyPendingFilter}
              className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
            >
              {rb.applyFilter}
            </button>
          </div>
        )}
      </div>

      <div className="mb-4 rounded-md border border-gray-200 bg-white p-3">
        <p className="mb-2 text-xs font-semibold uppercase text-gray-400">
          {b.visualizationLabel}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {DASHBOARD_CHART_VIZ_TYPES.map((v) => (
            <button
              key={v}
              type="button"
              data-testid={`viz-type-${v}`}
              onClick={() => applyDerived({ vizType: v })}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                vizType === v
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {b.vizTypes[v]}
            </button>
          ))}
        </div>
      </div>

      <div
        data-testid="chart-preview"
        className="h-64 rounded-md border border-gray-200 bg-white p-3"
      >
        {data ? (
          <ChartTile vizType={vizType} data={data} dictionary={dictionary} />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-gray-400">
            {b.noResults}
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      <Dialog.Root open={saveModalOpen} onOpenChange={setSaveModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/30" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-96 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-5 shadow-xl">
            <Dialog.Title className="mb-3 text-sm font-semibold text-gray-900">
              {b.saveModalTitle}
            </Dialog.Title>
            <input
              data-testid="chart-name-input"
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder={b.namePlaceholder}
              className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <label
              htmlFor="chart-dashboard-target"
              className="mb-1 block text-xs font-medium text-gray-500"
            >
              {b.dashboardTargetLabel}
            </label>
            <select
              id="chart-dashboard-target"
              data-testid="chart-dashboard-target"
              value={targetDashboardId}
              onChange={(e) => setTargetDashboardId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {dashboards.map((dashboard) => (
                <option key={dashboard.id} value={dashboard.id}>
                  {dashboard.name}
                </option>
              ))}
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
              >
                {b.cancel}
              </button>
              <button
                type="button"
                data-testid="confirm-save-chart-button"
                disabled={saving}
                onClick={handleConfirmSave}
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
