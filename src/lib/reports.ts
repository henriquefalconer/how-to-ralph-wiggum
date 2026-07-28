import { db } from "@/lib/db";
import {
  cardFieldValues,
  cards,
  phases as phasesTable,
  reports,
} from "@/lib/db/schema";
import {
  type ReportFilterGroup,
  evaluateReportFilters,
  isReportFilterOperator,
} from "@/lib/report-types";
import { desc, eq, inArray } from "drizzle-orm";

export {
  CARD_ATTRIBUTE_FIELD_IDS as cardAttributeFieldIds,
  REPORT_FILTER_OPERATORS as reportFilterOperators,
  evaluateReportFilters,
  isCardAttributeFieldId,
  isReportFilterOperator,
  reportFilterGroupsMatch,
  type CardAttributeFieldId,
  type ReportFilterCheck,
  type ReportFilterGroup,
  type ReportFilterOperator,
} from "@/lib/report-types";

export type Report = typeof reports.$inferSelect;

export interface ReportInput {
  name: string;
  filters: ReportFilterGroup[];
  visibleColumnFieldIds: string[];
}

export interface ReportUpdateInput {
  name?: string;
  filters?: ReportFilterGroup[];
  visibleColumnFieldIds?: string[];
}

function validateFilters(groups: ReportFilterGroup[]): void {
  for (const group of groups) {
    for (const check of group) {
      if (!check.fieldId) {
        throw new Error("Filter field is required");
      }
      if (!isReportFilterOperator(check.operator)) {
        throw new Error(`Unknown filter operator: ${check.operator}`);
      }
    }
  }
}

export async function listReports(pipeId: string): Promise<Report[]> {
  return db
    .select()
    .from(reports)
    .where(eq(reports.pipeId, pipeId))
    .orderBy(desc(reports.createdAt));
}

export async function getReport(id: string): Promise<Report | null> {
  const [row] = await db.select().from(reports).where(eq(reports.id, id));
  return row ?? null;
}

export async function createReport(
  pipeId: string,
  input: ReportInput,
): Promise<Report> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Report name is required");
  }
  validateFilters(input.filters);

  const [row] = await db
    .insert(reports)
    .values({
      pipeId,
      name,
      filters: input.filters,
      visibleColumnFieldIds: input.visibleColumnFieldIds,
    })
    .returning();

  return row;
}

export async function updateReport(
  id: string,
  input: ReportUpdateInput,
): Promise<Report> {
  if (input.name !== undefined && !input.name.trim()) {
    throw new Error("Report name is required");
  }
  if (input.filters !== undefined) {
    validateFilters(input.filters);
  }

  const [updated] = await db
    .update(reports)
    .set({
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.filters !== undefined ? { filters: input.filters } : {}),
      ...(input.visibleColumnFieldIds !== undefined
        ? { visibleColumnFieldIds: input.visibleColumnFieldIds }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(reports.id, id))
    .returning();

  if (!updated) {
    throw new Error("Report not found");
  }

  return updated;
}

export async function deleteReport(id: string): Promise<void> {
  const remaining = await db
    .delete(reports)
    .where(eq(reports.id, id))
    .returning({ id: reports.id });

  if (remaining.length === 0) {
    throw new Error("Report not found");
  }
}

export interface ReportRow {
  id: string;
  title: string;
  values: Record<string, string>;
}

export interface ReportResults {
  rows: ReportRow[];
  total: number;
}

/**
 * Live-queries every card in `pipeId` alongside its field values (custom
 * fields keyed by fieldId, plus the fixed card-attribute keys from
 * report-types.ts) and filters them through `filters`. Called fresh on every
 * read — a saved report is never a cached snapshot.
 */
export async function getReportRows(
  pipeId: string,
  filters: ReportFilterGroup[],
): Promise<ReportResults> {
  const pipeCards = await db
    .select()
    .from(cards)
    .where(eq(cards.pipeId, pipeId))
    .orderBy(desc(cards.createdAt));

  if (pipeCards.length === 0) {
    return { rows: [], total: 0 };
  }

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

  const valuesByCard = new Map<string, Record<string, string>>();
  for (const v of allValues) {
    const bucket = valuesByCard.get(v.cardId) ?? {};
    bucket[v.fieldId] = v.value;
    valuesByCard.set(v.cardId, bucket);
  }

  const allRows: ReportRow[] = pipeCards.map((card) => ({
    id: card.id,
    title: card.title,
    values: {
      ...(valuesByCard.get(card.id) ?? {}),
      _title: card.title,
      _currentPhase: phaseNameById.get(card.phaseId) ?? "",
      _createdAt: card.createdAt.toISOString(),
      _updatedAt: card.updatedAt.toISOString(),
      _done: card.done ? "true" : "false",
    },
  }));

  const matching = evaluateReportFilters(allRows, filters);
  return { rows: matching, total: matching.length };
}

export async function getReportResults(
  reportId: string,
): Promise<ReportResults> {
  const report = await getReport(reportId);
  if (!report) {
    throw new Error("Report not found");
  }
  return getReportRows(report.pipeId, report.filters as ReportFilterGroup[]);
}

export interface ReportWithCount extends Report {
  resultCount: number;
}

export async function listReportsWithCounts(
  pipeId: string,
): Promise<ReportWithCount[]> {
  const list = await listReports(pipeId);
  const withCounts = await Promise.all(
    list.map(async (report) => {
      const { total } = await getReportRows(
        pipeId,
        report.filters as ReportFilterGroup[],
      );
      return { ...report, resultCount: total };
    }),
  );
  return withCounts;
}
