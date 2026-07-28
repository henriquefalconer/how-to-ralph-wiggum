import {
  createAutomation,
  deleteAutomation,
  duplicateAutomation,
  getAutomation,
  listAutomationRuns,
  listAutomations,
  updateAutomation,
} from "@/lib/automations";
import { createCard, moveCardToPhase } from "@/lib/cards";
import { db } from "@/lib/db";
import {
  automationRuns,
  cardFieldValues,
  organizations,
  phases,
} from "@/lib/db/schema";
import { createField, deleteField } from "@/lib/fields";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { deletePhase } from "@/lib/phases";
import { createPipe } from "@/lib/pipes";
import { asc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

async function pipePhases(pipeId: string) {
  return db
    .select()
    .from(phases)
    .where(eq(phases.pipeId, pipeId))
    .orderBy(asc(phases.position));
}

describe("automations", () => {
  let orgId: string;

  beforeAll(async () => {
    const [org] = await db
      .insert(organizations)
      .values({ name: "Test Org (automations.test.ts)" })
      .returning();
    orgId = org.id;
  });

  afterAll(async () => {
    await db.delete(organizations).where(eq(organizations.id, orgId));
  });

  async function makePipe(name: string) {
    return createPipe(orgId, name, dictionaries.en.defaultPhase);
  }

  it("rejects creating an automation with no name", async () => {
    const pipe = await makePipe("No Name Pipe");
    const [inbox] = await pipePhases(pipe.id);
    await expect(
      createAutomation(pipe.id, {
        name: "  ",
        triggerType: "card_entered_phase",
        triggerConfig: { phaseId: inbox.id },
        actionType: "update_field",
        actionConfig: {
          targetFieldOwnerType: "start_form",
          targetFieldOwnerId: pipe.id,
          targetFieldId: "x",
          value: "y",
        },
      }),
    ).rejects.toThrow(/name/i);
  });

  it("rejects a card_entered_phase trigger with no phaseId", async () => {
    const pipe = await makePipe("No Phase Pipe");
    await expect(
      createAutomation(pipe.id, {
        name: "Rule",
        triggerType: "card_entered_phase",
        triggerConfig: {},
        actionType: "update_field",
        actionConfig: {
          targetFieldOwnerType: "start_form",
          targetFieldOwnerId: pipe.id,
          targetFieldId: "x",
          value: "y",
        },
      }),
    ).rejects.toThrow(/phaseId/i);
  });

  it("rejects an update_field action missing its target field config", async () => {
    const pipe = await makePipe("Bad Action Pipe");
    const [inbox] = await pipePhases(pipe.id);
    await expect(
      createAutomation(pipe.id, {
        name: "Rule",
        triggerType: "card_entered_phase",
        triggerConfig: { phaseId: inbox.id },
        actionType: "update_field",
        actionConfig: { value: "y" },
      }),
    ).rejects.toThrow(/targetFieldOwnerType/);
  });

  it("empty automations list for a pipe with none configured", async () => {
    const pipe = await makePipe("Empty Automations Pipe");
    const list = await listAutomations(pipe.id);
    expect(list).toEqual([]);
  });

  it("action targets a field by id, independent of the trigger's phase", async () => {
    const pipe = await makePipe("Purchase Requests");
    const [inbox, doing] = await pipePhases(pipe.id);

    const startFormField = await createField("start_form", pipe.id, {
      label: "Nome do solicitante",
      type: "short_text",
    });
    // "doing" (Fazendo) intentionally has zero fields of its own.
    const inboxField = await createField("phase", inbox.id, {
      label: "Nome do solicitante",
      type: "short_text",
    });

    const card = await createCard(pipe.id, inbox.id, {
      [startFormField.id]: "João Silva",
    });

    await createAutomation(pipe.id, {
      name: "Copy requester name",
      triggerType: "card_entered_phase",
      triggerConfig: { phaseId: doing.id },
      actionType: "update_field",
      actionConfig: {
        targetFieldOwnerType: "phase",
        targetFieldOwnerId: inbox.id,
        targetFieldId: inboxField.id,
        value: `{{start_form.${startFormField.id}}}`,
      },
    });

    await moveCardToPhase(card.id, doing.id);

    const runs = await listAutomationRuns(pipe.id);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ status: "success", cardId: card.id });

    const written = await db
      .select()
      .from(cardFieldValues)
      .where(eq(cardFieldValues.cardId, card.id));
    const targetValue = written.find(
      (v) => v.fieldOwnerType === "phase" && v.fieldId === inboxField.id,
    );
    expect(targetValue?.value).toBe("João Silva");
  });

  it("automation run is logged with success status", async () => {
    const pipe = await makePipe("Run Logging Pipe");
    const [inbox, doing] = await pipePhases(pipe.id);
    const startFormField = await createField("start_form", pipe.id, {
      label: "Title",
      type: "short_text",
    });
    const card = await createCard(pipe.id, inbox.id, {
      [startFormField.id]: "A card",
    });

    const automation = await createAutomation(pipe.id, {
      name: "Log rule",
      triggerType: "card_entered_phase",
      triggerConfig: { phaseId: doing.id },
      actionType: "update_field",
      actionConfig: {
        targetFieldOwnerType: "start_form",
        targetFieldOwnerId: pipe.id,
        targetFieldId: startFormField.id,
        value: "updated",
      },
    });

    await moveCardToPhase(card.id, doing.id);

    const runs = await db
      .select()
      .from(automationRuns)
      .where(eq(automationRuns.automationId, automation.id));
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({
      status: "success",
      cardId: card.id,
      cardTitle: card.title,
    });
    expect(runs[0].startedAt).toBeInstanceOf(Date);
  });

  it("disabling an automation prevents execution", async () => {
    const pipe = await makePipe("Disabled Pipe");
    const [inbox, doing] = await pipePhases(pipe.id);
    const startFormField = await createField("start_form", pipe.id, {
      label: "Title",
      type: "short_text",
    });
    const card = await createCard(pipe.id, inbox.id, {
      [startFormField.id]: "A card",
    });

    const automation = await createAutomation(pipe.id, {
      name: "Disabled rule",
      triggerType: "card_entered_phase",
      triggerConfig: { phaseId: doing.id },
      actionType: "update_field",
      actionConfig: {
        targetFieldOwnerType: "start_form",
        targetFieldOwnerId: pipe.id,
        targetFieldId: startFormField.id,
        value: "should not apply",
      },
    });
    await updateAutomation(automation.id, { enabled: false });

    await moveCardToPhase(card.id, doing.id);

    const runs = await db
      .select()
      .from(automationRuns)
      .where(eq(automationRuns.automationId, automation.id));
    expect(runs).toHaveLength(0);
  });

  it("logs an error run when the action's target phase no longer exists", async () => {
    const pipe = await makePipe("Deleted Phase Pipe");
    const [inbox, doing, done] = await pipePhases(pipe.id);
    const startFormField = await createField("start_form", pipe.id, {
      label: "Title",
      type: "short_text",
    });
    const doingField = await createField("phase", doing.id, {
      label: "Note",
      type: "short_text",
    });
    const card = await createCard(pipe.id, inbox.id, {
      [startFormField.id]: "A card",
    });

    const automation = await createAutomation(pipe.id, {
      name: "Targets a soon-deleted phase",
      triggerType: "card_entered_phase",
      triggerConfig: { phaseId: done.id },
      actionType: "update_field",
      actionConfig: {
        targetFieldOwnerType: "phase",
        targetFieldOwnerId: doing.id,
        targetFieldId: doingField.id,
        value: "x",
      },
    });

    await deleteField("phase", doing.id, doingField.id);
    await deletePhase(doing.id);

    await moveCardToPhase(card.id, done.id);

    const runs = await db
      .select()
      .from(automationRuns)
      .where(eq(automationRuns.automationId, automation.id));
    expect(runs).toHaveLength(1);
    expect(runs[0].status).toBe("error");
    expect(runs[0].message).toMatch(/no longer exists/i);
  });

  it("an unsupported action type (not yet implemented) logs an error run instead of throwing", async () => {
    const pipe = await makePipe("Unsupported Action Pipe");
    const [inbox, doing] = await pipePhases(pipe.id);
    const startFormField = await createField("start_form", pipe.id, {
      label: "Title",
      type: "short_text",
    });
    const card = await createCard(pipe.id, inbox.id, {
      [startFormField.id]: "A card",
    });
    const automation = await createAutomation(pipe.id, {
      name: "Ask AI rule",
      triggerType: "card_entered_phase",
      triggerConfig: { phaseId: doing.id },
      actionType: "ask_ai",
      actionConfig: {},
    });

    await moveCardToPhase(card.id, doing.id);

    const runs = await db
      .select()
      .from(automationRuns)
      .where(eq(automationRuns.automationId, automation.id));
    expect(runs).toHaveLength(1);
    expect(runs[0].status).toBe("error");
    expect(runs[0].message).toMatch(/not yet supported/i);
  });

  it("lists, updates, duplicates and deletes automations", async () => {
    const pipe = await makePipe("CRUD Pipe");
    const [inbox] = await pipePhases(pipe.id);

    const automation = await createAutomation(pipe.id, {
      name: "Original",
      triggerType: "card_entered_phase",
      triggerConfig: { phaseId: inbox.id },
      actionType: "update_field",
      actionConfig: {
        targetFieldOwnerType: "start_form",
        targetFieldOwnerId: pipe.id,
        targetFieldId: "x",
        value: "y",
      },
    });

    const listed = await listAutomations(pipe.id);
    expect(listed.map((a) => a.id)).toContain(automation.id);

    const updated = await updateAutomation(automation.id, { name: "Renamed" });
    expect(updated.name).toBe("Renamed");

    const duplicate = await duplicateAutomation(automation.id);
    expect(duplicate.id).not.toBe(automation.id);
    expect(duplicate.name).toBe("Renamed (copy)");

    await deleteAutomation(duplicate.id);
    expect(await getAutomation(duplicate.id)).toBeNull();

    await expect(
      deleteAutomation("00000000-0000-0000-0000-000000000000"),
    ).rejects.toThrow(/not found/i);
  });
});
