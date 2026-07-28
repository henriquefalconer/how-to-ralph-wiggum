import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import {
  conditionGroupsMatch,
  evaluateConditionals,
} from "@/lib/field-conditional-types";
import {
  createFieldConditional,
  deleteFieldConditional,
  listFieldConditionals,
  updateFieldConditional,
} from "@/lib/field-conditionals";
import { createField } from "@/lib/fields";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { listPhases } from "@/lib/phases";
import { createPipe } from "@/lib/pipes";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("field conditional evaluation engine (pure)", () => {
  it("evaluates conditionals in position order with last-write-wins on conflict", () => {
    const result = evaluateConditionals(
      [
        {
          position: 0,
          conditionGroups: [[{ fieldId: "x", operator: "equals", value: "1" }]],
          trueActions: [{ action: "hide", targetFieldId: "x" }],
          falseActions: [],
        },
        {
          position: 1,
          conditionGroups: [[{ fieldId: "x", operator: "equals", value: "1" }]],
          trueActions: [{ action: "show", targetFieldId: "x" }],
          falseActions: [],
        },
      ],
      { x: "1" },
    );

    // Both conditionals trigger (x === "1"); B is the later position, so its
    // "show" action overwrites A's earlier "hide" — the field ends up visible.
    expect(result.x).toBe("show");
  });

  it("triggers on AND within a group, OR across groups", () => {
    const groups = [
      [
        { fieldId: "fieldA", operator: "equals" as const, value: "1" },
        { fieldId: "fieldB", operator: "equals" as const, value: "2" },
      ],
      [{ fieldId: "fieldC", operator: "equals" as const, value: "3" }],
    ];

    // fieldC=3 alone satisfies group 2, even though group 1 (fieldA AND
    // fieldB) doesn't match at all.
    expect(
      conditionGroupsMatch(groups, {
        fieldA: "",
        fieldB: "",
        fieldC: "3",
      }),
    ).toBe(true);

    expect(
      conditionGroupsMatch(groups, {
        fieldA: "",
        fieldB: "",
        fieldC: "not 3",
      }),
    ).toBe(false);
  });

  it("requires every check within a group to pass (AND)", () => {
    const groups = [
      [
        { fieldId: "fieldA", operator: "equals" as const, value: "1" },
        { fieldId: "fieldB", operator: "equals" as const, value: "2" },
      ],
    ];

    expect(conditionGroupsMatch(groups, { fieldA: "1", fieldB: "2" })).toBe(
      true,
    );
    expect(conditionGroupsMatch(groups, { fieldA: "1", fieldB: "wrong" })).toBe(
      false,
    );
  });

  it("never triggers with an empty condition-group list", () => {
    expect(conditionGroupsMatch([], { anything: "value" })).toBe(false);
  });
});

describe("field-conditionals CRUD", () => {
  let orgId: string;

  beforeAll(async () => {
    const [org] = await db
      .insert(organizations)
      .values({ name: "Test Org (field-conditionals.test.ts)" })
      .returning();
    orgId = org.id;
  });

  afterAll(async () => {
    await db.delete(organizations).where(eq(organizations.id, orgId));
  });

  async function makePhaseWithFields() {
    const pipe = await createPipe(
      orgId,
      "Conditionals Pipe",
      dictionaries.en.defaultPhase,
    );
    const [inbox] = await listPhases(pipe.id);
    const status = await createField("phase", inbox.id, {
      label: "Status",
      type: "select",
      options: ["Pendente", "Aprovado"],
    });
    const priority = await createField("phase", inbox.id, {
      label: "Prioridade",
      type: "short_text",
    });
    return { phaseId: inbox.id, status, priority };
  }

  it("rejects a conditional with no name", async () => {
    const { phaseId, status, priority } = await makePhaseWithFields();
    await expect(
      createFieldConditional(phaseId, {
        name: "  ",
        conditionGroups: [
          [{ fieldId: status.id, operator: "equals", value: "Pendente" }],
        ],
        trueActions: [{ action: "hide", targetFieldId: priority.id }],
        falseActions: [],
      }),
    ).rejects.toThrow(/name/i);
  });

  it("rejects a conditional with no condition groups", async () => {
    const { phaseId, priority } = await makePhaseWithFields();
    await expect(
      createFieldConditional(phaseId, {
        name: "Hide priority",
        conditionGroups: [],
        trueActions: [{ action: "hide", targetFieldId: priority.id }],
        falseActions: [],
      }),
    ).rejects.toThrow(/condition/i);
  });

  it("creates, lists (ordered by position), updates and deletes a conditional", async () => {
    const { phaseId, status, priority } = await makePhaseWithFields();

    const created = await createFieldConditional(phaseId, {
      name: "Hide priority unless approved",
      conditionGroups: [
        [{ fieldId: status.id, operator: "equals", value: "Pendente" }],
      ],
      trueActions: [{ action: "hide", targetFieldId: priority.id }],
      falseActions: [],
    });
    expect(created.name).toBe("Hide priority unless approved");
    expect(created.position).toBe(0);

    const second = await createFieldConditional(phaseId, {
      name: "Show priority when approved",
      conditionGroups: [
        [{ fieldId: status.id, operator: "equals", value: "Aprovado" }],
      ],
      trueActions: [{ action: "show", targetFieldId: priority.id }],
      falseActions: [],
    });
    expect(second.position).toBe(1);

    const list = await listFieldConditionals(phaseId);
    expect(list.map((c) => c.id)).toEqual([created.id, second.id]);

    const updated = await updateFieldConditional(created.id, {
      name: "Renamed",
    });
    expect(updated.name).toBe("Renamed");

    await deleteFieldConditional(created.id);
    const remaining = await listFieldConditionals(phaseId);
    expect(remaining.map((c) => c.id)).toEqual([second.id]);

    await expect(deleteFieldConditional(created.id)).rejects.toThrow();
  });
});
