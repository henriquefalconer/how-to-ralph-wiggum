// Client-safe report-filter constants and pure evaluation logic — no
// `db`/`pg` import here, so the report builder can re-evaluate filters on
// every keystroke without pulling Postgres driver code into the browser
// bundle (same reasoning as field-conditional-types.ts).

// Card attributes are addressed the same way as custom fields (a single
// fieldId key into the row's `values` map) so filters/columns don't need a
// separate code path for "built-in" vs "custom" fields. Prefixed with an
// underscore, which real field ids (generated slugs) never start with.
export const CARD_ATTRIBUTE_FIELD_IDS = [
  "_title",
  "_currentPhase",
  "_createdAt",
  "_updatedAt",
  "_done",
] as const;

export type CardAttributeFieldId = (typeof CARD_ATTRIBUTE_FIELD_IDS)[number];

export function isCardAttributeFieldId(id: string): id is CardAttributeFieldId {
  return (CARD_ATTRIBUTE_FIELD_IDS as readonly string[]).includes(id);
}

export const REPORT_FILTER_OPERATORS = [
  "is",
  "is_not",
  "contains",
  "not_contains",
  "is_unknown",
  "exists",
] as const;

export type ReportFilterOperator = (typeof REPORT_FILTER_OPERATORS)[number];

export interface ReportFilterCheck {
  fieldId: string;
  operator: ReportFilterOperator;
  value: string;
}

export type ReportFilterGroup = ReportFilterCheck[];

export function isReportFilterOperator(
  value: string,
): value is ReportFilterOperator {
  return (REPORT_FILTER_OPERATORS as readonly string[]).includes(value);
}

function evaluateCheck(
  check: ReportFilterCheck,
  values: Record<string, string>,
): boolean {
  const actual = (values[check.fieldId] ?? "").trim();
  const expected = check.value.trim();
  switch (check.operator) {
    case "is":
      return actual === expected;
    case "is_not":
      return actual !== expected;
    case "contains":
      return actual.toLowerCase().includes(expected.toLowerCase());
    case "not_contains":
      return !actual.toLowerCase().includes(expected.toLowerCase());
    case "is_unknown":
      return actual === "";
    case "exists":
      return actual !== "";
    default:
      return false;
  }
}

/**
 * AND within a group (every check in the group must pass), OR across groups
 * (any single group passing is enough). No filters at all means every card
 * matches — a report with zero applied filters shows the whole pipe.
 */
export function reportFilterGroupsMatch(
  groups: ReportFilterGroup[],
  values: Record<string, string>,
): boolean {
  if (groups.length === 0) return true;
  return groups.some(
    (group) =>
      group.length > 0 && group.every((check) => evaluateCheck(check, values)),
  );
}

/**
 * Filters a set of {id, values} rows down to the ones matching the report's
 * filter groups. This is the pure core the unit tests exercise directly
 * (`evaluateReportFilters`) — the DB-backed report layer (reports.ts) just
 * supplies live `values` maps and calls through to this.
 */
export function evaluateReportFilters<
  T extends { values: Record<string, string> },
>(rows: T[], groups: ReportFilterGroup[]): T[] {
  return rows.filter((row) => reportFilterGroupsMatch(groups, row.values));
}
