import { createCard, moveCardToPhase, setPhaseFieldValue } from "@/lib/cards";
import {
  createChart,
  createDashboard,
  deleteChart,
  deleteDashboard,
  getChart,
  getDashboard,
  listCharts,
  listDashboards,
  listDashboardsWithChartCounts,
  renderChart,
  updateChart,
} from "@/lib/dashboards";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { createField } from "@/lib/fields";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { listPhases } from "@/lib/phases";
import { createPipe } from "@/lib/pipes";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("dashboards CRUD and live chart computation", () => {
  let orgId: string;

  beforeAll(async () => {
    const [org] = await db
      .insert(organizations)
      .values({ name: "Test Org (dashboards.test.ts)" })
      .returning();
    orgId = org.id;
  });

  afterAll(async () => {
    await db.delete(organizations).where(eq(organizations.id, orgId));
  });

  async function makePipe() {
    const pipe = await createPipe(
      orgId,
      "Dashboards Pipe",
      dictionaries.en.defaultPhase,
    );
    const [inbox, , done] = await listPhases(pipe.id);
    const titleField = await createField("start_form", pipe.id, {
      label: "Title",
      type: "short_text",
    });
    let counter = 0;
    async function makeCard(phaseId: string) {
      counter += 1;
      return createCard(pipe.id, phaseId, {
        [titleField.id]: `Card ${counter}`,
      });
    }
    return { pipe, inbox, done, titleField, makeCard };
  }

  it("rejects a dashboard with no name", async () => {
    const { pipe } = await makePipe();
    await expect(createDashboard(pipe.id, "  ")).rejects.toThrow(/name/i);
  });

  it("creates, lists and deletes a dashboard", async () => {
    const { pipe } = await makePipe();
    const dashboard = await createDashboard(pipe.id, "Visão Geral");
    expect(dashboard.name).toBe("Visão Geral");
    expect(dashboard.defaultTimeRange).toBe("all_time");

    const fetched = await getDashboard(dashboard.id);
    expect(fetched?.id).toBe(dashboard.id);

    const list = await listDashboards(pipe.id);
    expect(list.map((d) => d.id)).toEqual([dashboard.id]);

    await deleteDashboard(dashboard.id);
    expect(await listDashboards(pipe.id)).toEqual([]);
    await expect(deleteDashboard(dashboard.id)).rejects.toThrow();
  });

  it("reports zero dashboards with an empty list, no error", async () => {
    const { pipe } = await makePipe();
    expect(await listDashboardsWithChartCounts(pipe.id)).toEqual([]);
  });

  it("rejects a chart with an unknown metric or visualization type", async () => {
    const { pipe } = await makePipe();
    const dashboard = await createDashboard(pipe.id, "Board");
    await expect(
      createChart(dashboard.id, {
        title: "Bad",
        metric: "made_up" as never,
        vizType: "number",
      }),
    ).rejects.toThrow(/metric/i);
    await expect(
      createChart(dashboard.id, {
        title: "Bad",
        metric: "cards_total",
        vizType: "made_up" as never,
      }),
    ).rejects.toThrow(/visualization/i);
  });

  it("changing viz_type to 'number' clears time_grouping and drops the auto title's grouping suffix", async () => {
    const { pipe, inbox, makeCard } = await makePipe();
    const dashboard = await createDashboard(pipe.id, "Board");
    await makeCard(inbox.id);

    const chart = await createChart(dashboard.id, {
      title: "Cards (Total) By Day",
      metric: "cards_total",
      vizType: "bar",
      timeGrouping: "day",
    });
    expect(chart.timeGrouping).toBe("day");

    const updated = await updateChart(chart.id, { vizType: "number" });
    expect(updated.timeGrouping).toBeNull();
    expect(updated.title).not.toContain("By Day");
    expect(updated.title).toBe("Cards (Total)");
  });

  it("a dashboard chart re-queries live card data without re-saving it", async () => {
    const { pipe, inbox, makeCard } = await makePipe();
    const dashboard = await createDashboard(pipe.id, "Board");
    await makeCard(inbox.id);

    const chart = await createChart(dashboard.id, {
      title: "Cards (Total)",
      metric: "cards_total",
      vizType: "number",
    });

    const before = await renderChart(chart.id);
    expect(before.total).toBe(1);

    await makeCard(inbox.id);

    const after = await renderChart(chart.id);
    expect(after.total).toBe(2);
  });

  it("renders a zero value, not an error, for a metric with zero matching cards", async () => {
    const { pipe, inbox, titleField, makeCard } = await makePipe();
    const dashboard = await createDashboard(pipe.id, "Board");
    await makeCard(inbox.id);

    const chart = await createChart(dashboard.id, {
      title: "Nothing matches",
      metric: "cards_total",
      vizType: "number",
      filters: [[{ fieldId: titleField.id, operator: "is", value: "Nope" }]],
    });

    const data = await renderChart(chart.id);
    expect(data.total).toBe(0);
    expect(data.points).toEqual([{ label: "", value: 0 }]);
  });

  it("computes lead time (hours) from card creation to when it entered a done phase", async () => {
    const { pipe, inbox, done, makeCard } = await makePipe();
    const dashboard = await createDashboard(pipe.id, "Board");
    const card = await makeCard(inbox.id);
    await moveCardToPhase(card.id, done.id);

    const chart = await createChart(dashboard.id, {
      title: "Lead time",
      metric: "lead_time_max",
      vizType: "number",
    });

    const data = await renderChart(chart.id);
    // The move just happened, so lead time is a small, non-negative number
    // of hours rather than zero (createdAt !== the done transition instant).
    expect(data.total).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(data.total)).toBe(true);
  });

  it("groups a bar chart's cards_total by dimension field value", async () => {
    const { pipe, inbox, makeCard } = await makePipe();
    const dashboard = await createDashboard(pipe.id, "Board");
    const status = await createField("phase", inbox.id, {
      label: "Status",
      type: "select",
      options: ["Aberto", "Fechado"],
    });

    const cardA = await makeCard(inbox.id);
    const cardB = await makeCard(inbox.id);
    await setPhaseFieldValue(cardA.id, status.id, "Aberto");
    await setPhaseFieldValue(cardB.id, status.id, "Fechado");

    const chart = await createChart(dashboard.id, {
      title: "By status",
      metric: "cards_total",
      vizType: "bar",
      dimensionFieldId: status.id,
    });

    const data = await renderChart(chart.id);
    const byLabel = Object.fromEntries(
      data.points.map((p) => [p.label, p.value]),
    );
    expect(byLabel.Aberto).toBe(1);
    expect(byLabel.Fechado).toBe(1);
    expect(data.total).toBe(2);
  });

  it("computes attachments_total and assignees_total from filled field values, and comments_total as zero", async () => {
    const { pipe, inbox, makeCard } = await makePipe();
    const dashboard = await createDashboard(pipe.id, "Board");
    const attachmentField = await createField("phase", inbox.id, {
      label: "Anexo",
      type: "attachment",
    });
    const assigneeField = await createField("phase", inbox.id, {
      label: "Responsável",
      type: "assignee_select",
      options: ["person-1"],
    });

    const card = await makeCard(inbox.id);
    await setPhaseFieldValue(card.id, attachmentField.id, "file.pdf");
    await setPhaseFieldValue(card.id, assigneeField.id, "person-1");

    const attachmentsChart = await createChart(dashboard.id, {
      title: "Attachments",
      metric: "attachments_total",
      vizType: "number",
    });
    const assigneesChart = await createChart(dashboard.id, {
      title: "Assignees",
      metric: "assignees_total",
      vizType: "number",
    });
    const commentsChart = await createChart(dashboard.id, {
      title: "Comments",
      metric: "comments_total",
      vizType: "number",
    });

    expect((await renderChart(attachmentsChart.id)).total).toBe(1);
    expect((await renderChart(assigneesChart.id)).total).toBe(1);
    expect((await renderChart(commentsChart.id)).total).toBe(0);
  });

  it("lists charts on a dashboard and deletes one", async () => {
    const { pipe } = await makePipe();
    const dashboard = await createDashboard(pipe.id, "Board");
    const chart = await createChart(dashboard.id, {
      title: "Cards (Total)",
      metric: "cards_total",
      vizType: "number",
    });

    expect((await listCharts(dashboard.id)).map((c) => c.id)).toEqual([
      chart.id,
    ]);

    await deleteChart(chart.id);
    expect(await listCharts(dashboard.id)).toEqual([]);
    expect(await getChart(chart.id)).toBeNull();
  });
});
