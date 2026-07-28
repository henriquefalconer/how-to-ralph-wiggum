import {
  createCard,
  getCardDetail,
  listCardsForPipe,
  moveCardToPhase,
  setPhaseFieldValue,
} from "@/lib/cards";
import { db } from "@/lib/db";
import { organizations, phases, pipes } from "@/lib/db/schema";
import { createField } from "@/lib/fields";
import { dictionaries } from "@/lib/i18n/dictionaries";
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

describe("cards", () => {
  let orgId: string;

  beforeAll(async () => {
    const [org] = await db
      .insert(organizations)
      .values({ name: "Test Org (cards.test.ts)" })
      .returning();
    orgId = org.id;
  });

  afterAll(async () => {
    await db.delete(organizations).where(eq(organizations.id, orgId));
  });

  async function makePipe(name: string) {
    return createPipe(orgId, name, dictionaries.en.defaultPhase);
  }

  it("rejects creating a card when it would have no title", async () => {
    const pipe = await makePipe("No Start Form Pipe");
    const [firstPhase] = await pipePhases(pipe.id);

    await expect(createCard(pipe.id, firstPhase.id, {})).rejects.toThrow(
      /title/i,
    );
  });

  it("derives the card title from the start form's first field by default", async () => {
    const pipe = await makePipe("Default Title Pipe");
    const [firstPhase] = await pipePhases(pipe.id);
    const nameField = await createField("start_form", pipe.id, {
      label: "Requester name",
      type: "short_text",
    });

    const card = await createCard(pipe.id, firstPhase.id, {
      [nameField.id]: "Ada Lovelace",
    });
    expect(card.title).toBe("Ada Lovelace");
    expect(card.phaseId).toBe(firstPhase.id);
    expect(card.done).toBe(false);
  });

  it("uses pipe.titleFieldId over the first start form field when set", async () => {
    const pipe = await makePipe("Custom Title Field Pipe");
    const [firstPhase] = await pipePhases(pipe.id);
    const nameField = await createField("start_form", pipe.id, {
      label: "Requester name",
      type: "short_text",
    });
    const subjectField = await createField("start_form", pipe.id, {
      label: "Subject",
      type: "short_text",
    });
    await db
      .update(pipes)
      .set({ titleFieldId: subjectField.id })
      .where(eq(pipes.id, pipe.id));

    const card = await createCard(pipe.id, firstPhase.id, {
      [nameField.id]: "Ada Lovelace",
      [subjectField.id]: "Reimbursement request",
    });
    expect(card.title).toBe("Reimbursement request");
  });

  it("rejects creating a card that omits a required start form field", async () => {
    const pipe = await makePipe("Required Field Pipe");
    const [firstPhase] = await pipePhases(pipe.id);
    const nameField = await createField("start_form", pipe.id, {
      label: "Name",
      type: "short_text",
      required: true,
    });

    await expect(
      createCard(pipe.id, firstPhase.id, { [nameField.id]: "" }),
    ).rejects.toThrow(/name/i);
  });

  it("stores the submitted start form values, readable via getCardDetail", async () => {
    const pipe = await makePipe("Values Pipe");
    const [firstPhase] = await pipePhases(pipe.id);
    const nameField = await createField("start_form", pipe.id, {
      label: "Name",
      type: "short_text",
    });

    const card = await createCard(pipe.id, firstPhase.id, {
      [nameField.id]: "Grace Hopper",
    });

    const detail = await getCardDetail(card.id);
    expect(detail?.startForm).toHaveLength(1);
    expect(detail?.startForm[0]).toMatchObject({
      value: "Grace Hopper",
    });
    expect(detail?.startForm[0].field.id).toBe(nameField.id);
  });

  it("moving a card updates its phase_id and each phase's derived card count", async () => {
    const pipe = await makePipe("Move Pipe");
    const [firstPhase, secondPhase] = await pipePhases(pipe.id);
    const nameField = await createField("start_form", pipe.id, {
      label: "Name",
      type: "short_text",
    });
    const card = await createCard(pipe.id, firstPhase.id, {
      [nameField.id]: "Katherine Johnson",
    });

    const beforeCards = await listCardsForPipe(pipe.id);
    expect(beforeCards.filter((c) => c.phaseId === firstPhase.id)).toHaveLength(
      1,
    );
    expect(
      beforeCards.filter((c) => c.phaseId === secondPhase.id),
    ).toHaveLength(0);

    const moved = await moveCardToPhase(card.id, secondPhase.id);
    expect(moved.phaseId).toBe(secondPhase.id);

    const afterCards = await listCardsForPipe(pipe.id);
    expect(afterCards.filter((c) => c.phaseId === firstPhase.id)).toHaveLength(
      0,
    );
    expect(afterCards.filter((c) => c.phaseId === secondPhase.id)).toHaveLength(
      1,
    );
  });

  it("records a Histórico transition when a card moves phases", async () => {
    const pipe = await makePipe("History Pipe");
    const [firstPhase, secondPhase] = await pipePhases(pipe.id);
    const nameField = await createField("start_form", pipe.id, {
      label: "Name",
      type: "short_text",
    });
    const card = await createCard(pipe.id, firstPhase.id, {
      [nameField.id]: "Margaret Hamilton",
    });

    await moveCardToPhase(card.id, secondPhase.id);

    const detail = await getCardDetail(card.id);
    expect(detail?.history).toHaveLength(1);
    expect(detail?.history[0]).toMatchObject({
      fromPhaseId: firstPhase.id,
      toPhaseId: secondPhase.id,
    });
  });

  it("marks a card done when moved into a done phase", async () => {
    const pipe = await makePipe("Done Phase Pipe");
    const [firstPhase, , thirdPhase] = await pipePhases(pipe.id);
    const nameField = await createField("start_form", pipe.id, {
      label: "Name",
      type: "short_text",
    });
    const card = await createCard(pipe.id, firstPhase.id, {
      [nameField.id]: "Hedy Lamarr",
    });
    expect(thirdPhase.done).toBe(true);

    const moved = await moveCardToPhase(card.id, thirdPhase.id);
    expect(moved.done).toBe(true);
  });

  it("saves and updates a current-phase field value via setPhaseFieldValue", async () => {
    const pipe = await makePipe("Phase Field Pipe");
    const [firstPhase] = await pipePhases(pipe.id);
    const nameField = await createField("start_form", pipe.id, {
      label: "Name",
      type: "short_text",
    });
    const notesField = await createField("phase", firstPhase.id, {
      label: "Notes",
      type: "long_text",
    });
    const card = await createCard(pipe.id, firstPhase.id, {
      [nameField.id]: "Ada",
    });

    await setPhaseFieldValue(card.id, notesField.id, "First note");
    let detail = await getCardDetail(card.id);
    expect(detail?.phaseFields[0]).toMatchObject({ value: "First note" });

    await setPhaseFieldValue(card.id, notesField.id, "Updated note");
    detail = await getCardDetail(card.id);
    expect(detail?.phaseFields[0]).toMatchObject({ value: "Updated note" });
  });

  it("rejects setting a value for a field that isn't on the card's current phase", async () => {
    const pipe = await makePipe("Wrong Phase Field Pipe");
    const [firstPhase, secondPhase] = await pipePhases(pipe.id);
    const nameField = await createField("start_form", pipe.id, {
      label: "Name",
      type: "short_text",
    });
    const secondPhaseField = await createField("phase", secondPhase.id, {
      label: "Only on second phase",
      type: "short_text",
    });
    const card = await createCard(pipe.id, firstPhase.id, {
      [nameField.id]: "Ada",
    });

    await expect(
      setPhaseFieldValue(card.id, secondPhaseField.id, "nope"),
    ).rejects.toThrow();
  });

  it("returns null from getCardDetail for a card that does not exist", async () => {
    const detail = await getCardDetail("00000000-0000-0000-0000-000000000000");
    expect(detail).toBeNull();
  });
});
