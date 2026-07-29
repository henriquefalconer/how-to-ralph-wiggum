import {
  CANONICAL_CHART_LABELS,
  type ChartConfig,
  deriveChartDefaults,
  isDashboardChartMetric,
  isDashboardChartTimeGrouping,
  isDashboardChartVizType,
} from "@/lib/dashboard-types";
import { describe, expect, it } from "vitest";

describe("dashboard chart type guards", () => {
  it("accepts every declared metric and rejects unknown ones", () => {
    expect(isDashboardChartMetric("cards_total")).toBe(true);
    expect(isDashboardChartMetric("lead_time_avg")).toBe(true);
    expect(isDashboardChartMetric("made_up_metric")).toBe(false);
  });

  it("accepts every declared time grouping and rejects unknown ones", () => {
    expect(isDashboardChartTimeGrouping("day")).toBe(true);
    expect(isDashboardChartTimeGrouping("none")).toBe(true);
    expect(isDashboardChartTimeGrouping("fortnight")).toBe(false);
  });

  it("accepts every declared viz type and rejects unknown ones", () => {
    expect(isDashboardChartVizType("number")).toBe(true);
    expect(isDashboardChartVizType("scatter")).toBe(true);
    expect(isDashboardChartVizType("wordcloud")).toBe(false);
  });
});

describe("deriveChartDefaults", () => {
  const base: ChartConfig = {
    title: "Cards (Total) By Day",
    metric: "cards_total",
    timeGrouping: "day",
    vizType: "bar",
  };

  it("switching to the Número visualization clears time grouping and drops the auto title's grouping suffix", () => {
    const next = deriveChartDefaults(
      base,
      { vizType: "number" },
      CANONICAL_CHART_LABELS,
    );
    expect(next.timeGrouping).toBeNull();
    expect(next.title).toBe("Cards (Total)");
    expect(next.title).not.toContain("By Day");
  });

  it("re-derives the title when the metric changes on an auto-titled chart", () => {
    const next = deriveChartDefaults(
      base,
      { metric: "assignees_total" },
      CANONICAL_CHART_LABELS,
    );
    expect(next.title).toBe("Assignee (Total) By Day");
  });

  it("leaves a user-renamed title untouched when switching to Número", () => {
    const customized: ChartConfig = { ...base, title: "My custom title" };
    const next = deriveChartDefaults(
      customized,
      { vizType: "number" },
      CANONICAL_CHART_LABELS,
    );
    expect(next.timeGrouping).toBeNull();
    expect(next.title).toBe("My custom title");
  });

  it("respects an explicit title patch instead of re-deriving it", () => {
    const next = deriveChartDefaults(
      base,
      { vizType: "number", title: "Explicitly renamed" },
      CANONICAL_CHART_LABELS,
    );
    expect(next.title).toBe("Explicitly renamed");
  });

  it("switching away from Número to a grouped viz does not resurrect grouping on its own", () => {
    const numberChart: ChartConfig = {
      title: "Cards (Total)",
      metric: "cards_total",
      timeGrouping: null,
      vizType: "number",
    };
    const next = deriveChartDefaults(
      numberChart,
      { vizType: "bar" },
      CANONICAL_CHART_LABELS,
    );
    expect(next.timeGrouping).toBeNull();
    expect(next.title).toBe("Cards (Total)");
  });
});
