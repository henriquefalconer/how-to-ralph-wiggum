import {
  evaluateReportFilters,
  reportFilterGroupsMatch,
} from "@/lib/report-types";
import { describe, expect, it } from "vitest";

describe("report filter evaluation engine (pure)", () => {
  it("matches AND-within-group, OR-across-groups", () => {
    const groups = [
      [{ fieldId: "status", operator: "is" as const, value: "Pendente" }],
      [{ fieldId: "priority", operator: "is" as const, value: "Alta" }],
    ];

    // priority=Alta alone satisfies group 2, even though status != Pendente.
    expect(
      reportFilterGroupsMatch(groups, { status: "Aprovado", priority: "Alta" }),
    ).toBe(true);

    expect(
      reportFilterGroupsMatch(groups, {
        status: "Aprovado",
        priority: "Baixa",
      }),
    ).toBe(false);
  });

  it("requires every check within a group to pass (AND)", () => {
    const groups = [
      [
        { fieldId: "status", operator: "is" as const, value: "Pendente" },
        { fieldId: "priority", operator: "is" as const, value: "Alta" },
      ],
    ];

    expect(
      reportFilterGroupsMatch(groups, { status: "Pendente", priority: "Alta" }),
    ).toBe(true);
    expect(
      reportFilterGroupsMatch(groups, {
        status: "Pendente",
        priority: "Baixa",
      }),
    ).toBe(false);
  });

  it("matches everything when there are no filter groups", () => {
    expect(reportFilterGroupsMatch([], { anything: "value" })).toBe(true);
  });

  it("supports is_not, contains, not_contains, is_unknown and exists", () => {
    const values = { name: "João Silva" };
    expect(
      reportFilterGroupsMatch(
        [[{ fieldId: "name", operator: "is_not", value: "Maria" }]],
        values,
      ),
    ).toBe(true);
    expect(
      reportFilterGroupsMatch(
        [[{ fieldId: "name", operator: "contains", value: "silva" }]],
        values,
      ),
    ).toBe(true);
    expect(
      reportFilterGroupsMatch(
        [[{ fieldId: "name", operator: "not_contains", value: "silva" }]],
        values,
      ),
    ).toBe(false);
    expect(
      reportFilterGroupsMatch(
        [[{ fieldId: "missing", operator: "is_unknown", value: "" }]],
        values,
      ),
    ).toBe(true);
    expect(
      reportFilterGroupsMatch(
        [[{ fieldId: "name", operator: "exists", value: "" }]],
        values,
      ),
    ).toBe(true);
  });

  it("filters a row set down to the ones matching the report's filters", () => {
    const rows = [
      { id: "1", values: { status: "Pendente", priority: "Alta" } },
      { id: "2", values: { status: "Aprovado", priority: "Alta" } },
      { id: "3", values: { status: "Aprovado", priority: "Baixa" } },
    ];
    const groups = [
      [{ fieldId: "status", operator: "is" as const, value: "Pendente" }],
      [{ fieldId: "priority", operator: "is" as const, value: "Alta" }],
    ];

    expect(evaluateReportFilters(rows, groups).map((r) => r.id)).toEqual([
      "1",
      "2",
    ]);
  });
});
