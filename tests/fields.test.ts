import { db } from "@/lib/db";
import { organizations, phases } from "@/lib/db/schema";
import {
  createField,
  deleteField,
  isFieldValueEditable,
  listFields,
  slugify,
  updateField,
} from "@/lib/fields";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { createPipe } from "@/lib/pipes";
import { asc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

async function firstPhaseId(pipeId: string): Promise<string> {
  const [phase] = await db
    .select()
    .from(phases)
    .where(eq(phases.pipeId, pipeId))
    .orderBy(asc(phases.position));
  return phase.id;
}

describe("fields", () => {
  let orgId: string;
  let phaseId: string;

  beforeAll(async () => {
    const [org] = await db
      .insert(organizations)
      .values({ name: "Test Org (fields.test.ts)" })
      .returning();
    orgId = org.id;

    const pipe = await createPipe(
      orgId,
      "Test Pipe",
      dictionaries.en.defaultPhase,
    );
    phaseId = await firstPhaseId(pipe.id);
  });

  afterAll(async () => {
    await db.delete(organizations).where(eq(organizations.id, orgId));
  });

  it("generates a field id slug from the label, collapsing non-alphanumeric runs to underscores", () => {
    expect(slugify("Long Text Fiéld")).toBe("long_text_fi_ld");
  });

  it("creates a field with an id slug generated from its label", async () => {
    const field = await createField("phase", phaseId, {
      label: "Priority Level",
      type: "short_text",
    });
    expect(field.id).toBe("priority_level");
    expect(field.label).toBe("Priority Level");
    expect(field.type).toBe("short_text");
    expect(field.required).toBe(false);
  });

  it("rejects creating a select field with an empty options array", async () => {
    await expect(
      createField("phase", phaseId, {
        label: "Status",
        type: "select",
        options: [],
      }),
    ).rejects.toThrow(/options/i);
  });

  it("creates a select field once options are provided", async () => {
    const field = await createField("phase", phaseId, {
      label: "Status",
      type: "select",
      options: ["Low", "Medium", "High"],
    });
    expect(field.options).toEqual(["Low", "Medium", "High"]);
  });

  it("auto-suffixes a duplicate label's slug within the same owner scope", async () => {
    const first = await createField("phase", phaseId, {
      label: "Name",
      type: "short_text",
    });
    const second = await createField("phase", phaseId, {
      label: "Name",
      type: "short_text",
    });
    expect(first.id).toBe("name");
    expect(second.id).toBe("name_2");
  });

  it("keeps the same label's slug independent across different owners", async () => {
    const pipe = await createPipe(
      orgId,
      "Second Pipe",
      dictionaries.en.defaultPhase,
    );
    const otherPhaseId = await firstPhaseId(pipe.id);

    const field = await createField("phase", otherPhaseId, {
      label: "Name",
      type: "short_text",
    });
    expect(field.id).toBe("name");
  });

  it("lists fields for a phase ordered by creation/position", async () => {
    const pipe = await createPipe(
      orgId,
      "List Order Pipe",
      dictionaries.en.defaultPhase,
    );
    const listPhaseId = await firstPhaseId(pipe.id);

    await createField("phase", listPhaseId, {
      label: "First",
      type: "short_text",
    });
    await createField("phase", listPhaseId, {
      label: "Second",
      type: "short_text",
    });

    const listed = await listFields("phase", listPhaseId);
    expect(listed.map((f) => f.label)).toEqual(["First", "Second"]);
    expect(listed.map((f) => f.position)).toEqual([0, 1]);
  });

  it("updates a field's label and required flag", async () => {
    const field = await createField("phase", phaseId, {
      label: "Editable Field",
      type: "short_text",
    });
    const updated = await updateField("phase", phaseId, field.id, {
      required: true,
      help: "Fill this in",
    });
    expect(updated.required).toBe(true);
    expect(updated.help).toBe("Fill this in");
  });

  it("rejects clearing a choice field's options down to an empty array", async () => {
    const field = await createField("phase", phaseId, {
      label: "Priority Choice",
      type: "radio_vertical",
      options: ["A", "B"],
    });
    await expect(
      updateField("phase", phaseId, field.id, { options: [] }),
    ).rejects.toThrow(/options/i);
  });

  it("deletes a field", async () => {
    const field = await createField("phase", phaseId, {
      label: "Temp Field",
      type: "short_text",
    });
    await deleteField("phase", phaseId, field.id);
    const listed = await listFields("phase", phaseId);
    expect(listed.find((f) => f.id === field.id)).toBeUndefined();
  });

  it("rejects deleting a field that does not exist", async () => {
    await expect(
      deleteField("phase", phaseId, "does_not_exist"),
    ).rejects.toThrow();
  });

  it("treats id and statement field types as never editable", () => {
    expect(isFieldValueEditable({ type: "id" })).toBe(false);
    expect(isFieldValueEditable({ type: "statement" })).toBe(false);
    expect(isFieldValueEditable({ type: "short_text" })).toBe(true);
  });
});
