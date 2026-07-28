import { db } from "@/lib/db";
import { organizations, phases } from "@/lib/db/schema";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { createPipe } from "@/lib/pipes";
import { asc, eq } from "drizzle-orm";
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
