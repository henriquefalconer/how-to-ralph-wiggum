import { createCard } from "@/lib/cards";
import { db } from "@/lib/db";
import { fields, organizations, phases } from "@/lib/db/schema";
import { createField } from "@/lib/fields";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { formatCardsCount } from "@/lib/i18n/format";
import {
  createPipe,
  deletePipe,
  getPipe,
  resolveCreateCardButtonLabel,
  resolveItemName,
  updatePipeSettings,
} from "@/lib/pipes";
import { and, asc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("createPipe", () => {
  let orgId: string;

  beforeAll(async () => {
    const [org] = await db
      .insert(organizations)
      .values({ name: "Test Org (pipes.test.ts)" })
      .returning();
    orgId = org.id;
  });

  afterAll(async () => {
    await db.delete(organizations).where(eq(organizations.id, orgId));
  });

  it("assigns a color and auto-provisions the 3-phase starter template", async () => {
    const pipe = await createPipe(
      orgId,
      "Purchase Requests",
      dictionaries.en.defaultPhase,
    );

    expect(pipe.id).toBeTruthy();
    expect(pipe.color).toBeTruthy();

    const pipePhases = await db
      .select()
      .from(phases)
      .where(eq(phases.pipeId, pipe.id))
      .orderBy(asc(phases.position));

    expect(pipePhases).toHaveLength(3);
    expect(pipePhases.map((p) => p.name)).toEqual(["Inbox", "Doing", "Done"]);
    expect(pipePhases.map((p) => p.done)).toEqual([false, false, true]);
  });

  it("rejects a blank or whitespace-only name", async () => {
    await expect(
      createPipe(orgId, "", dictionaries.en.defaultPhase),
    ).rejects.toThrow();
    await expect(
      createPipe(orgId, "   ", dictionaries.en.defaultPhase),
    ).rejects.toThrow();
  });

  it("assigns different colors to sequentially created pipes", async () => {
    const first = await createPipe(orgId, "A", dictionaries.en.defaultPhase);
    const second = await createPipe(orgId, "B", dictionaries.en.defaultPhase);

    expect(first.color).not.toBe(second.color);
  });

  it("creates phases using the requested locale's default phase names", async () => {
    const pipe = await createPipe(
      orgId,
      "Solicitações",
      dictionaries.pt.defaultPhase,
    );

    const pipePhases = await db
      .select()
      .from(phases)
      .where(eq(phases.pipeId, pipe.id))
      .orderBy(asc(phases.position));

    expect(pipePhases.map((p) => p.name)).toEqual([
      "Caixa de entrada",
      "Fazendo",
      "Concluído",
    ]);
  });
});

describe("pipe general settings", () => {
  let orgId: string;

  beforeAll(async () => {
    const [org] = await db
      .insert(organizations)
      .values({ name: "Test Org (pipes.test.ts settings)" })
      .returning();
    orgId = org.id;
  });

  afterAll(async () => {
    await db.delete(organizations).where(eq(organizations.id, orgId));
  });

  it("changing titleFieldId changes future card.title derivation", async () => {
    const pipe = await createPipe(
      orgId,
      "Title Field Pipe",
      dictionaries.en.defaultPhase,
    );
    const pipePhases = await db
      .select()
      .from(phases)
      .where(eq(phases.pipeId, pipe.id))
      .orderBy(asc(phases.position));

    await createField("start_form", pipe.id, {
      label: "Status",
      type: "short_text",
    });
    await createField("start_form", pipe.id, {
      label: "Outro Campo",
      type: "short_text",
    });

    await updatePipeSettings(pipe.id, { titleFieldId: "status" });

    const card = await createCard(pipe.id, pipePhases[0].id, {
      status: "Aprovado",
      outro_campo: "x",
    });

    expect(card.title).toBe("Aprovado");
  });

  it("item_name overrides the default 'Cards' label used in UI copy", async () => {
    const pipe = await createPipe(
      orgId,
      "Item Name Pipe",
      dictionaries.en.defaultPhase,
    );

    const updated = await updatePipeSettings(pipe.id, { itemName: "Tickets" });
    expect(updated.itemName).toBe("Tickets");

    expect(resolveItemName(updated, dictionaries.en)).toBe("Tickets");
    expect(resolveCreateCardButtonLabel(updated, dictionaries.en)).toBe(
      "Create new Tickets",
    );
    expect(formatCardsCount(dictionaries.en, 3, updated.itemName)).toBe(
      "3 Tickets",
    );

    // An explicit create-button override still wins over the itemName template.
    const withOverride = await updatePipeSettings(pipe.id, {
      createCardButtonLabel: "New Ticket",
    });
    expect(resolveCreateCardButtonLabel(withOverride, dictionaries.en)).toBe(
      "New Ticket",
    );
  });

  it("falls back to the localized default item name when unset", async () => {
    const pipe = await createPipe(
      orgId,
      "Default Item Name Pipe",
      dictionaries.en.defaultPhase,
    );
    expect(pipe.itemName).toBeNull();
    expect(resolveItemName(pipe, dictionaries.en)).toBe("cards");
    expect(resolveCreateCardButtonLabel(pipe, dictionaries.en)).toBe(
      "Create new card",
    );
  });

  it("rejects more than 3 tags", async () => {
    const pipe = await createPipe(
      orgId,
      "Tags Pipe",
      dictionaries.en.defaultPhase,
    );
    await expect(
      updatePipeSettings(pipe.id, { tags: ["a", "b", "c", "d"] }),
    ).rejects.toThrow(/3 tags/);
  });

  it("rejects a negative expiration alert time", async () => {
    const pipe = await createPipe(
      orgId,
      "Expiration Pipe",
      dictionaries.en.defaultPhase,
    );
    await expect(
      updatePipeSettings(pipe.id, { expirationAlertTime: -1 }),
    ).rejects.toThrow(/negative/);
  });

  it("deletePipe removes the pipe and its polymorphic start_form/phase fields", async () => {
    const pipe = await createPipe(
      orgId,
      "Delete Me Pipe",
      dictionaries.en.defaultPhase,
    );
    const pipePhases = await db
      .select()
      .from(phases)
      .where(eq(phases.pipeId, pipe.id));

    await createField("start_form", pipe.id, {
      label: "Doomed Start Field",
      type: "short_text",
    });
    await createField("phase", pipePhases[0].id, {
      label: "Doomed Phase Field",
      type: "short_text",
    });

    await deletePipe(pipe.id);

    expect(await getPipe(pipe.id)).toBeNull();

    const remainingStartFields = await db
      .select()
      .from(fields)
      .where(
        and(eq(fields.ownerType, "start_form"), eq(fields.ownerId, pipe.id)),
      );
    expect(remainingStartFields).toHaveLength(0);

    const remainingPhaseFields = await db
      .select()
      .from(fields)
      .where(
        and(
          eq(fields.ownerType, "phase"),
          eq(fields.ownerId, pipePhases[0].id),
        ),
      );
    expect(remainingPhaseFields).toHaveLength(0);
  });
});
