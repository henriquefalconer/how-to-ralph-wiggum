import {
  CANONICAL_CHART_LABELS,
  type ChartConfig,
  type DashboardChartMetric,
  type DashboardChartTimeGrouping,
  type DashboardChartVizType,
  deriveChartDefaults,
  isDashboardChartMetric,
  isDashboardChartTimeGrouping,
  isDashboardChartVizType,
  isDashboardTimeFieldId,
  isDashboardTimeRange,
} from "@/lib/dashboard-types";
import { db } from "@/lib/db";
import {
  cardFieldValues,
  cards,
  dashboardCharts,
  dashboards,
  phases as phasesTable,
} from "@/lib/db/schema";
import { type FieldType, listFields } from "@/lib/fields";
import {
  type ReportFilterGroup,
  evaluateReportFilters,
} from "@/lib/report-types";
import { asc, desc, eq, inArray } from "drizzle-orm";

export {
  CANONICAL_CHART_LABELS as canonicalChartLabels,
  DASHBOARD_CHART_METRICS as dashboardChartMetrics,
  DASHBOARD_CHART_TIME_GROUPINGS as dashboardChartTimeGroupings,
  DASHBOARD_CHART_VIZ_TYPES as dashboardChartVizTypes,
  DASHBOARD_TIME_FIELD_IDS as dashboardTimeFieldIds,
  DASHBOARD_TIME_RANGES as dashboardTimeRanges,
  deriveChartDefaults,
  isDashboardChartMetric,
  isDashboardChartTimeGrouping,
  isDashboardChartVizType,
  isDashboardTimeFieldId,
  isDashboardTimeRange,
  type ChartConfig,
  type ChartDefaultLabels,
  type DashboardChartMetric,
  type DashboardChartTimeGrouping,
  type DashboardChartVizType,
  type DashboardTimeFieldId,
  type DashboardTimeRange,
} from "@/lib/dashboard-types";

export type Dashboard = typeof dashboards.$inferSelect;
export type DashboardChart = typeof dashboardCharts.$inferSelect;

const DEFAULT_POSITION = { x: 0, y: 0, w: 4, h: 3 };

// ---------- Dashboards ----------

export interface DashboardWithChartCount extends Dashboard {
  chartCount: number;
}

export async function listDashboards(pipeId: string): Promise<Dashboard[]> {
  return db
    .select()
    .from(dashboards)
    .where(eq(dashboards.pipeId, pipeId))
    .orderBy(asc(dashboards.createdAt));
}

export async function listDashboardsWithChartCounts(
  pipeId: string,
): Promise<DashboardWithChartCount[]> {
  const list = await listDashboards(pipeId);
  return Promise.all(
    list.map(async (dashboard) => {
      const charts = await listCharts(dashboard.id);
      return { ...dashboard, chartCount: charts.length };
    }),
  );
}

export async function getDashboard(id: string): Promise<Dashboard | null> {
  const [row] = await db.select().from(dashboards).where(eq(dashboards.id, id));
  return row ?? null;
}

export async function createDashboard(
  pipeId: string,
  name: string,
): Promise<Dashboard> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Dashboard name is required");
  }
  const [row] = await db
    .insert(dashboards)
    .values({ pipeId, name: trimmed })
    .returning();
  return row;
}

export async function deleteDashboard(id: string): Promise<void> {
  const remaining = await db
    .delete(dashboards)
    .where(eq(dashboards.id, id))
    .returning({ id: dashboards.id });
  if (remaining.length === 0) {
    throw new Error("Dashboard not found");
  }
}

// ---------- Charts ----------

export interface ChartInput {
  title: string;
  metric: DashboardChartMetric;
  dimensionFieldId?: string | null;
  timeFieldId?: string;
  timeRange?: string;
  timeGrouping?: DashboardChartTimeGrouping | null;
  vizType: DashboardChartVizType;
  filters?: ReportFilterGroup[];
  position?: { x: number; y: number; w: number; h: number };
}

export interface ChartUpdateInput {
  title?: string;
  metric?: DashboardChartMetric;
  dimensionFieldId?: string | null;
  timeFieldId?: string;
  timeRange?: string;
  timeGrouping?: DashboardChartTimeGrouping | null;
  vizType?: DashboardChartVizType;
  filters?: ReportFilterGroup[];
  position?: { x: number; y: number; w: number; h: number };
}

function validateChartFields(input: {
  metric: string;
  vizType: string;
  timeGrouping?: string | null;
  timeFieldId?: string;
  timeRange?: string;
}): void {
  if (!isDashboardChartMetric(input.metric)) {
    throw new Error(`Unknown metric: ${input.metric}`);
  }
  if (!isDashboardChartVizType(input.vizType)) {
    throw new Error(`Unknown visualization type: ${input.vizType}`);
  }
  if (
    input.timeGrouping != null &&
    !isDashboardChartTimeGrouping(input.timeGrouping)
  ) {
    throw new Error(`Unknown time grouping: ${input.timeGrouping}`);
  }
  if (
    input.timeFieldId !== undefined &&
    !isDashboardTimeFieldId(input.timeFieldId)
  ) {
    throw new Error(`Unknown time field: ${input.timeFieldId}`);
  }
  if (input.timeRange !== undefined && !isDashboardTimeRange(input.timeRange)) {
    throw new Error(`Unknown time range: ${input.timeRange}`);
  }
}

// "none" and SQL NULL both mean "no time grouping" — normalized to null so
// there is exactly one representation to check against everywhere else.
function normalizeGrouping(
  value: string | null | undefined,
): Exclude<DashboardChartTimeGrouping, "none"> | null {
  if (!value || value === "none") return null;
  return value as Exclude<DashboardChartTimeGrouping, "none">;
}

export async function listCharts(
  dashboardId: string,
): Promise<DashboardChart[]> {
  return db
    .select()
    .from(dashboardCharts)
    .where(eq(dashboardCharts.dashboardId, dashboardId))
    .orderBy(asc(dashboardCharts.createdAt));
}

export async function getChart(id: string): Promise<DashboardChart | null> {
  const [row] = await db
    .select()
    .from(dashboardCharts)
    .where(eq(dashboardCharts.id, id));
  return row ?? null;
}

export async function createChart(
  dashboardId: string,
  input: ChartInput,
): Promise<DashboardChart> {
  const title = input.title.trim();
  if (!title) {
    throw new Error("Chart title is required");
  }
  validateChartFields(input);

  const timeGrouping =
    input.vizType === "number" ? null : normalizeGrouping(input.timeGrouping);

  const [row] = await db
    .insert(dashboardCharts)
    .values({
      dashboardId,
      title,
      metric: input.metric,
      dimensionFieldId: input.dimensionFieldId ?? null,
      timeFieldId: input.timeFieldId ?? "_createdAt",
      timeRange: input.timeRange ?? "all_time",
      timeGrouping,
      vizType: input.vizType,
      filters: input.filters ?? [],
      position: input.position ?? DEFAULT_POSITION,
    })
    .returning();
  return row;
}

export async function updateChart(
  id: string,
  input: ChartUpdateInput,
): Promise<DashboardChart> {
  const existing = await getChart(id);
  if (!existing) {
    throw new Error("Chart not found");
  }
  if (input.title !== undefined && !input.title.trim()) {
    throw new Error("Chart title is required");
  }

  validateChartFields({
    metric: input.metric ?? existing.metric,
    vizType: input.vizType ?? existing.vizType,
    timeGrouping:
      input.timeGrouping !== undefined
        ? input.timeGrouping
        : existing.timeGrouping,
    timeFieldId: input.timeFieldId,
    timeRange: input.timeRange,
  });

  const currentConfig: ChartConfig = {
    title: existing.title,
    metric: existing.metric,
    timeGrouping: existing.timeGrouping,
    vizType: existing.vizType,
  };

  const derived = deriveChartDefaults(
    currentConfig,
    {
      ...(input.metric !== undefined ? { metric: input.metric } : {}),
      ...(input.vizType !== undefined ? { vizType: input.vizType } : {}),
      ...(input.timeGrouping !== undefined
        ? { timeGrouping: normalizeGrouping(input.timeGrouping) }
        : {}),
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
    },
    CANONICAL_CHART_LABELS,
  );

  const [updated] = await db
    .update(dashboardCharts)
    .set({
      title: derived.title,
      metric: derived.metric,
      timeGrouping: derived.timeGrouping,
      vizType: derived.vizType,
      ...(input.dimensionFieldId !== undefined
        ? { dimensionFieldId: input.dimensionFieldId }
        : {}),
      ...(input.timeFieldId !== undefined
        ? { timeFieldId: input.timeFieldId }
        : {}),
      ...(input.timeRange !== undefined ? { timeRange: input.timeRange } : {}),
      ...(input.filters !== undefined ? { filters: input.filters } : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
      updatedAt: new Date(),
    })
    .where(eq(dashboardCharts.id, id))
    .returning();

  return updated;
}

export async function deleteChart(id: string): Promise<void> {
  const remaining = await db
    .delete(dashboardCharts)
    .where(eq(dashboardCharts.id, id))
    .returning({ id: dashboardCharts.id });
  if (remaining.length === 0) {
    throw new Error("Chart not found");
  }
}

// ---------- Live metric computation ----------

interface PipeCardRow {
  id: string;
  values: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
  done: boolean;
  attachmentsCount: number;
  assigneesCount: number;
}

async function getPipeFieldTypeMap(
  pipeId: string,
): Promise<Map<string, FieldType>> {
  const startFormFields = await listFields("start_form", pipeId);
  const pipePhases = await db
    .select()
    .from(phasesTable)
    .where(eq(phasesTable.pipeId, pipeId));
  const phaseFieldsArrays = await Promise.all(
    pipePhases.map((phase) => listFields("phase", phase.id)),
  );

  const map = new Map<string, FieldType>();
  for (const field of startFormFields) {
    map.set(field.id, field.type as FieldType);
  }
  for (const fieldsForPhase of phaseFieldsArrays) {
    for (const field of fieldsForPhase) {
      map.set(field.id, field.type as FieldType);
    }
  }
  return map;
}

/**
 * "Anexos do Card (Total)" / "Responsável (Total)" have no dedicated
 * comment/attachment entity — they're computed by counting filled values of
 * fields typed "attachment" / "assignee_select" (card_field_values), same as
 * every other custom field. "Comentários do card (Total)" has no backing
 * entity in this clone at all yet, so it always reports 0 rather than a
 * fabricated count.
 */
async function getPipeCardRows(pipeId: string): Promise<PipeCardRow[]> {
  const pipeCards = await db
    .select()
    .from(cards)
    .where(eq(cards.pipeId, pipeId))
    .orderBy(desc(cards.createdAt));
  if (pipeCards.length === 0) return [];

  const phaseIds = [...new Set(pipeCards.map((c) => c.phaseId))];
  const phaseRows = await db
    .select()
    .from(phasesTable)
    .where(inArray(phasesTable.id, phaseIds));
  const phaseNameById = new Map(phaseRows.map((p) => [p.id, p.name]));

  const cardIds = pipeCards.map((c) => c.id);
  const allValues = await db
    .select()
    .from(cardFieldValues)
    .where(inArray(cardFieldValues.cardId, cardIds));
  const fieldTypeMap = await getPipeFieldTypeMap(pipeId);

  const valuesByCard = new Map<string, Record<string, string>>();
  const attachmentsByCard = new Map<string, number>();
  const assigneesByCard = new Map<string, number>();
  for (const v of allValues) {
    const bucket = valuesByCard.get(v.cardId) ?? {};
    bucket[v.fieldId] = v.value;
    valuesByCard.set(v.cardId, bucket);

    if (v.value.trim()) {
      const type = fieldTypeMap.get(v.fieldId);
      if (type === "attachment") {
        attachmentsByCard.set(
          v.cardId,
          (attachmentsByCard.get(v.cardId) ?? 0) + 1,
        );
      }
      if (type === "assignee_select") {
        assigneesByCard.set(v.cardId, (assigneesByCard.get(v.cardId) ?? 0) + 1);
      }
    }
  }

  return pipeCards.map((card) => ({
    id: card.id,
    values: {
      ...(valuesByCard.get(card.id) ?? {}),
      _title: card.title,
      _currentPhase: phaseNameById.get(card.phaseId) ?? "",
      _createdAt: card.createdAt.toISOString(),
      _updatedAt: card.updatedAt.toISOString(),
      _done: card.done ? "true" : "false",
    },
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
    done: card.done,
    attachmentsCount: attachmentsByCard.get(card.id) ?? 0,
    assigneesCount: assigneesByCard.get(card.id) ?? 0,
  }));
}

function withinTimeRange(
  row: PipeCardRow,
  timeFieldId: string,
  timeRange: string,
  now: Date,
): boolean {
  if (timeRange === "all_time") return true;
  const t = timeFieldId === "_updatedAt" ? row.updatedAt : row.createdAt;
  const cutoff = new Date(now);
  if (timeRange === "last_7_days") cutoff.setDate(cutoff.getDate() - 7);
  else if (timeRange === "last_30_days") cutoff.setDate(cutoff.getDate() - 30);
  else if (timeRange === "last_12_months")
    cutoff.setMonth(cutoff.getMonth() - 12);
  return t >= cutoff;
}

/** Lead time = time from card creation to the moment it entered a "done"
 * phase (card.updatedAt at that transition), or to now for still-open
 * cards — an "open lead time", matching the live-updating nature of every
 * other dashboard metric here. */
function leadTimeHours(row: PipeCardRow, now: Date): number {
  const end = row.done ? row.updatedAt : now;
  return Math.max(0, (end.getTime() - row.createdAt.getTime()) / 3_600_000);
}

function metricValue(
  metric: DashboardChartMetric,
  rows: PipeCardRow[],
  now: Date,
): number {
  switch (metric) {
    case "cards_total":
      return rows.length;
    case "attachments_total":
      return rows.reduce((sum, r) => sum + r.attachmentsCount, 0);
    case "assignees_total":
      return rows.reduce((sum, r) => sum + r.assigneesCount, 0);
    case "comments_total":
      return 0;
    case "lead_time_min":
    case "lead_time_sum":
    case "lead_time_max":
    case "lead_time_avg": {
      const hours = rows.map((r) => leadTimeHours(r, now));
      if (hours.length === 0) return 0;
      if (metric === "lead_time_min") return Math.min(...hours);
      if (metric === "lead_time_max") return Math.max(...hours);
      const sum = hours.reduce((a, b) => a + b, 0);
      return metric === "lead_time_sum" ? sum : sum / hours.length;
    }
    default:
      return 0;
  }
}

function bucketKeyForTime(
  date: Date,
  grouping: Exclude<DashboardChartTimeGrouping, "none">,
): string {
  if (grouping === "month") return date.toISOString().slice(0, 7);
  if (grouping === "day") return date.toISOString().slice(0, 10);

  // ISO 8601 week key (Monday-start, Thursday-anchored) — ties bucketing to
  // the same convention every "week" chip elsewhere in this clone assumes.
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((d.getTime() - firstThursday.getTime()) / 86_400_000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface ChartData {
  points: ChartPoint[];
  total: number;
}

export interface ChartQueryConfig {
  metric: DashboardChartMetric;
  dimensionFieldId?: string | null;
  timeFieldId?: string;
  timeRange?: string;
  timeGrouping?: string | null;
  filters?: ReportFilterGroup[];
}

async function computeChartData(
  pipeId: string,
  config: ChartQueryConfig,
  now: Date,
): Promise<ChartData> {
  const allRows = await getPipeCardRows(pipeId);
  const filtered = evaluateReportFilters(allRows, config.filters ?? []);
  const timeFieldId = config.timeFieldId ?? "_createdAt";
  const timeRange = isDashboardTimeRange(config.timeRange ?? "all_time")
    ? (config.timeRange ?? "all_time")
    : "all_time";
  const inRange = filtered.filter((row) =>
    withinTimeRange(row, timeFieldId, timeRange, now),
  );

  const metric = config.metric;
  const grouping = normalizeGrouping(config.timeGrouping);

  if (grouping) {
    const buckets = new Map<string, PipeCardRow[]>();
    for (const row of inRange) {
      const t = timeFieldId === "_updatedAt" ? row.updatedAt : row.createdAt;
      const key = bucketKeyForTime(t, grouping);
      const bucket = buckets.get(key) ?? [];
      bucket.push(row);
      buckets.set(key, bucket);
    }
    const points = [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, rows]) => ({
        label,
        value: metricValue(metric, rows, now),
      }));
    return { points, total: metricValue(metric, inRange, now) };
  }

  if (config.dimensionFieldId) {
    const dimensionFieldId = config.dimensionFieldId;
    const buckets = new Map<string, PipeCardRow[]>();
    for (const row of inRange) {
      const key = row.values[dimensionFieldId] ?? "";
      const bucket = buckets.get(key) ?? [];
      bucket.push(row);
      buckets.set(key, bucket);
    }
    const points = [...buckets.entries()]
      .sort(([, a], [, b]) => b.length - a.length)
      .map(([label, rows]) => ({
        label,
        value: metricValue(metric, rows, now),
      }));
    return { points, total: metricValue(metric, inRange, now) };
  }

  const value = metricValue(metric, inRange, now);
  return { points: [{ label: "", value }], total: value };
}

/** Live-queries current card data every call — a saved chart is never a
 * frozen snapshot, same guarantee as feature-011's reports. */
export async function renderChart(chartId: string): Promise<ChartData> {
  const chart = await getChart(chartId);
  if (!chart) {
    throw new Error("Chart not found");
  }
  const dashboard = await getDashboard(chart.dashboardId);
  if (!dashboard) {
    throw new Error("Dashboard not found");
  }
  return computeChartData(
    dashboard.pipeId,
    {
      metric: chart.metric,
      dimensionFieldId: chart.dimensionFieldId,
      timeFieldId: chart.timeFieldId,
      timeRange: chart.timeRange,
      timeGrouping: chart.timeGrouping,
      filters: chart.filters as ReportFilterGroup[],
    },
    new Date(),
  );
}

/** Powers the chart builder's live preview — the same computation as
 * `renderChart`, but against an in-progress (not-yet-saved) config. */
export async function previewChartData(
  pipeId: string,
  config: ChartQueryConfig,
): Promise<ChartData> {
  return computeChartData(pipeId, config, new Date());
}
