import { createCard, moveCardToPhase, setPhaseFieldValue } from "@/lib/cards";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { createField } from "@/lib/fields";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { listPhases } from "@/lib/phases";
import { createPipe } from "@/lib/pipes";
import {
  createReport,
  deleteReport,
  getReport,
  getReportResults,
  listReports,
  listReportsWithCounts,
  updateReport,
} from "@/lib/reports";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("reports CRUD and live-query results", () => {
  let orgId: string;

  beforeAll(async () => {
    const [org] = await db
      .insert(organizations)
      .values({ name: "Test Org (reports.test.ts)" })
      .returning();
    orgId = org.id;
  });

  afterAll(async () => {
    await db.delete(organizations).where(eq(organizations.id, orgId));
  });

  async function makePipeWithField() {
    const pipe = await createPipe(
      orgId,
      "Reports Pipe",
      dictionaries.en.defaultPhase,
    );
    const [inbox, , done] = await listPhases(pipe.id);
    const titleField = await createField("start_form", pipe.id, {
      label: "Title",
      type: "short_text",
    });
    const priority = await createField("phase", inbox.id, {
      label: "Prioridade",
      type: "select",
      options: ["Alta", "Baixa"],
    });
    let counter = 0;
    async function makeCard(phaseId: string) {
      counter += 1;
      return createCard(pipe.id, phaseId, {
        [titleField.id]: `Card ${counter}`,
      });
    }
    return { pipe, inbox, done, priority, makeCard };
  }

  it("rejects a report with no name", async () => {
    const { pipe } = await makePipeWithField();
    await expect(
      createReport(pipe.id, {
        name: "  ",
        filters: [],
        visibleColumnFieldIds: [],
      }),
    ).rejects.toThrow(/name/i);
  });

  it("rejects a filter with an unknown operator", async () => {
    const { pipe, priority } = await makePipeWithField();
    await expect(
      createReport(pipe.id, {
        name: "Bad report",
        filters: [
          [{ fieldId: priority.id, operator: "made_up" as never, value: "" }],
        ],
        visibleColumnFieldIds: [],
      }),
    ).rejects.toThrow(/operator/i);
  });

  it("creates, lists, updates and deletes a report", async () => {
    const { pipe, priority } = await makePipeWithField();

    const created = await createReport(pipe.id, {
      name: "Alta priority",
      filters: [[{ fieldId: priority.id, operator: "is", value: "Alta" }]],
      visibleColumnFieldIds: [priority.id],
    });
    expect(created.name).toBe("Alta priority");

    const fetched = await getReport(created.id);
    expect(fetched?.id).toBe(created.id);

    const list = await listReports(pipe.id);
    expect(list.map((r) => r.id)).toEqual([created.id]);

    const updated = await updateReport(created.id, { name: "Renamed" });
    expect(updated.name).toBe("Renamed");

    await deleteReport(created.id);
    expect(await listReports(pipe.id)).toEqual([]);
    await expect(deleteReport(created.id)).rejects.toThrow();
  });

  it("a report with two filter groups matches a card satisfying either group in full (AND-within/OR-across)", async () => {
    const { pipe, inbox, priority, makeCard } = await makePipeWithField();
    const status = await createField("phase", inbox.id, {
      label: "Status",
      type: "select",
      options: ["Pendente", "Aprovado"],
    });

    const cardA = await makeCard(inbox.id);
    await setPhaseFieldValue(cardA.id, status.id, "Aprovado");
    await setPhaseFieldValue(cardA.id, priority.id, "Alta");

    const cardB = await makeCard(inbox.id);
    await setPhaseFieldValue(cardB.id, status.id, "Pendente");
    await setPhaseFieldValue(cardB.id, priority.id, "Baixa");

    const report = await createReport(pipe.id, {
      name: "Pendente or Alta",
      filters: [
        [{ fieldId: status.id, operator: "is", value: "Pendente" }],
        [{ fieldId: priority.id, operator: "is", value: "Alta" }],
      ],
      visibleColumnFieldIds: [],
    });

    const results = await getReportResults(report.id);
    // cardA matches via the priority group, cardB via the status group.
    expect(results.rows.map((r) => r.id).sort()).toEqual(
      [cardA.id, cardB.id].sort(),
    );
    expect(results.total).toBe(2);
  });

  it("re-queries live data on every open, not a cached snapshot", async () => {
    const { pipe, inbox, priority, makeCard } = await makePipeWithField();
    const card = await makeCard(inbox.id);
    await setPhaseFieldValue(card.id, priority.id, "Baixa");

    const report = await createReport(pipe.id, {
      name: "Alta only",
      filters: [[{ fieldId: priority.id, operator: "is", value: "Alta" }]],
      visibleColumnFieldIds: [],
    });

    const before = await getReportResults(report.id);
    expect(before.rows).toHaveLength(0);

    await setPhaseFieldValue(card.id, priority.id, "Alta");

    const after = await getReportResults(report.id);
    expect(after.rows.map((r) => r.id)).toEqual([card.id]);
  });

  it("matches nothing and reports zero results for a filter with no matching cards", async () => {
    const { pipe, inbox, priority, makeCard } = await makePipeWithField();
    await makeCard(inbox.id);

    const report = await createReport(pipe.id, {
      name: "Nothing matches",
      filters: [[{ fieldId: priority.id, operator: "is", value: "Alta" }]],
      visibleColumnFieldIds: [],
    });

    const results = await getReportResults(report.id);
    expect(results.total).toBe(0);
    expect(results.rows).toEqual([]);
  });

  it("filters on the built-in current-phase card attribute", async () => {
    const { pipe, inbox, done, makeCard } = await makePipeWithField();
    const cardInInbox = await makeCard(inbox.id);
    const cardMovedToDone = await makeCard(inbox.id);
    await moveCardToPhase(cardMovedToDone.id, done.id);

    const report = await createReport(pipe.id, {
      name: "In Done",
      filters: [
        [{ fieldId: "_currentPhase", operator: "is", value: done.name }],
      ],
      visibleColumnFieldIds: [],
    });

    const results = await getReportResults(report.id);
    expect(results.rows.map((r) => r.id)).toEqual([cardMovedToDone.id]);
    expect(results.rows.map((r) => r.id)).not.toContain(cardInInbox.id);
  });

  it("lists reports with a live result count per report", async () => {
    const { pipe, inbox, priority, makeCard } = await makePipeWithField();
    const card = await makeCard(inbox.id);
    await setPhaseFieldValue(card.id, priority.id, "Alta");

    await createReport(pipe.id, {
      name: "Alta",
      filters: [[{ fieldId: priority.id, operator: "is", value: "Alta" }]],
      visibleColumnFieldIds: [],
    });
    await createReport(pipe.id, {
      name: "Baixa",
      filters: [[{ fieldId: priority.id, operator: "is", value: "Baixa" }]],
      visibleColumnFieldIds: [],
    });

    const withCounts = await listReportsWithCounts(pipe.id);
    const alta = withCounts.find((r) => r.name === "Alta");
    const baixa = withCounts.find((r) => r.name === "Baixa");
    expect(alta?.resultCount).toBe(1);
    expect(baixa?.resultCount).toBe(0);
  });
});
