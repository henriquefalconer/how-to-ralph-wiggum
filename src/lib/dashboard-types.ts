import type {
  dashboardChartMetrics,
  dashboardChartTimeGroupings,
  dashboardChartVizTypes,
} from "@/lib/db/schema";

// Client-safe dashboard-chart constants and pure config-derivation logic —
// no `db`/`pg` import here, so the chart builder can re-derive defaults on
// every keystroke without pulling Postgres driver code into the browser
// bundle (same reasoning as report-types.ts / automation-types.ts).

export type DashboardChartMetric = (typeof dashboardChartMetrics)[number];
export type DashboardChartTimeGrouping =
  (typeof dashboardChartTimeGroupings)[number];
export type DashboardChartVizType = (typeof dashboardChartVizTypes)[number];

export const DASHBOARD_CHART_METRICS: readonly DashboardChartMetric[] = [
  "cards_total",
  "attachments_total",
  "comments_total",
  "lead_time_min",
  "lead_time_sum",
  "lead_time_max",
  "lead_time_avg",
  "assignees_total",
];

export const DASHBOARD_CHART_TIME_GROUPINGS: readonly DashboardChartTimeGrouping[] =
  ["day", "week", "month", "none"];

export const DASHBOARD_CHART_VIZ_TYPES: readonly DashboardChartVizType[] = [
  "area",
  "bar",
  "calendar",
  "line",
  "number",
  "pie",
  "scatter",
  "table",
];

// The two timestamp-bearing card attributes a chart can group/filter by —
// a restriction of report-types.ts's CARD_ATTRIBUTE_FIELD_IDS.
export const DASHBOARD_TIME_FIELD_IDS = ["_createdAt", "_updatedAt"] as const;
export type DashboardTimeFieldId = (typeof DASHBOARD_TIME_FIELD_IDS)[number];

export const DASHBOARD_TIME_RANGES = [
  "all_time",
  "last_7_days",
  "last_30_days",
  "last_12_months",
] as const;
export type DashboardTimeRange = (typeof DASHBOARD_TIME_RANGES)[number];

export function isDashboardChartMetric(
  value: string,
): value is DashboardChartMetric {
  return (DASHBOARD_CHART_METRICS as readonly string[]).includes(value);
}

export function isDashboardChartTimeGrouping(
  value: string,
): value is DashboardChartTimeGrouping {
  return (DASHBOARD_CHART_TIME_GROUPINGS as readonly string[]).includes(value);
}

export function isDashboardChartVizType(
  value: string,
): value is DashboardChartVizType {
  return (DASHBOARD_CHART_VIZ_TYPES as readonly string[]).includes(value);
}

export function isDashboardTimeFieldId(
  value: string,
): value is DashboardTimeFieldId {
  return (DASHBOARD_TIME_FIELD_IDS as readonly string[]).includes(value);
}

export function isDashboardTimeRange(
  value: string,
): value is DashboardTimeRange {
  return (DASHBOARD_TIME_RANGES as readonly string[]).includes(value);
}

export interface ChartConfig {
  title: string;
  metric: DashboardChartMetric;
  timeGrouping: DashboardChartTimeGrouping | null;
  vizType: DashboardChartVizType;
}

export interface ChartDefaultLabels {
  metric: Record<DashboardChartMetric, string>;
  // Full suffix phrase already localized, e.g. "Por Dia" (pt-BR) or "By Day"
  // (en) — kept opaque here so this module never hardcodes a connector word.
  groupingSuffix: Record<Exclude<DashboardChartTimeGrouping, "none">, string>;
}

// Fixed, non-localized fallback labels used by the server-side invariant in
// dashboards.ts#updateChart (clearing time grouping / stripping the title
// suffix on a vizType change even if a caller — e.g. the raw API — didn't
// send localized labels). The interactive chart builder always computes and
// sends its own dictionary-localized title, so this constant never reaches
// end users directly.
export const CANONICAL_CHART_LABELS: ChartDefaultLabels = {
  metric: {
    cards_total: "Cards (Total)",
    attachments_total: "Attachments (Total)",
    comments_total: "Comments (Total)",
    lead_time_min: "Lead Time (hours) - Min",
    lead_time_sum: "Lead Time (hours) - Sum",
    lead_time_max: "Lead Time (hours) - Max",
    lead_time_avg: "Lead Time (hours) - Avg",
    assignees_total: "Assignee (Total)",
  },
  groupingSuffix: {
    day: "By Day",
    week: "By Week",
    month: "By Month",
  },
};

function autoTitle(
  metric: DashboardChartMetric,
  timeGrouping: DashboardChartTimeGrouping | null,
  labels: ChartDefaultLabels,
): string {
  const base = labels.metric[metric];
  if (!timeGrouping || timeGrouping === "none") return base;
  return `${base} ${labels.groupingSuffix[timeGrouping]}`;
}

/**
 * Confirmed live (Iteration 6): switching a chart's Visualização to Número
 * collapses "Grupo de tempo" to "Sem agrupamento" and drops the auto title's
 * grouping suffix. Config fields here are computed UI defaults, re-derived
 * whenever metric/vizType/timeGrouping change — not independently persisted
 * per visualization type. The title is only rewritten if it still matches
 * what auto-generation would have produced for the PREVIOUS config; a
 * user-renamed title is left untouched.
 */
export function deriveChartDefaults(
  current: ChartConfig,
  patch: Partial<
    Pick<ChartConfig, "metric" | "vizType" | "timeGrouping" | "title">
  >,
  labels: ChartDefaultLabels,
): ChartConfig {
  const next: ChartConfig = { ...current, ...patch };
  if (next.vizType === "number") {
    next.timeGrouping = null;
  }

  const titleWasExplicitlyPatched = patch.title !== undefined;
  if (!titleWasExplicitlyPatched) {
    const oldAutoTitle = autoTitle(
      current.metric,
      current.timeGrouping,
      labels,
    );
    if (current.title === oldAutoTitle) {
      next.title = autoTitle(next.metric, next.timeGrouping, labels);
    }
  }

  return next;
}
