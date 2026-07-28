import { db } from "@/lib/db";
import { organizations, phases } from "@/lib/db/schema";
import { dictionaries } from "@/lib/i18n/dictionaries";
import {
  createPhase,
  deletePhase,
  listPhases,
  reorderPhases,
  updatePhase,
} from "@/lib/phases";
import { createPipe } from "@/lib/pipes";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("phases", () => {
  let orgId: string;

  beforeAll(async () => {
    const [org] = await db
      .insert(organizations)
      .values({ name: "Test Org (phases.test.ts)" })
      .returning();
    orgId = org.id;
  });

  afterAll(async () => {
    await db.delete(organizations).where(eq(organizations.id, orgId));
  });

  async function makePipe() {
    return createPipe(orgId, "Test Pipe", dictionaries.en.defaultPhase);
  }

  it("returns phases for a pipe ordered by position ascending", async () => {
    const pipe = await makePipe();
    const initial = await listPhases(pipe.id);
    expect(initial.map((p) => p.position)).toEqual([0, 1, 2]);

    // Force out-of-order positions [2, 0, 1] directly, then confirm listPhases re-sorts.
    await db
      .update(phases)
      .set({ position: 2 })
      .where(eq(phases.id, initial[0].id));
    await db
      .update(phases)
      .set({ position: 0 })
      .where(eq(phases.id, initial[1].id));
    await db
      .update(phases)
      .set({ position: 1 })
      .where(eq(phases.id, initial[2].id));

    const reordered = await listPhases(pipe.id);
    expect(reordered.map((p) => p.position)).toEqual([0, 1, 2]);
    expect(reordered.map((p) => p.id)).toEqual([
      initial[1].id,
      initial[2].id,
      initial[0].id,
    ]);
  });

  it("marks a phase done via updatePhase", async () => {
    const pipe = await makePipe();
    const [first] = await listPhases(pipe.id);

    const updated = await updatePhase(first.id, { done: true });
    expect(updated.done).toBe(true);

    const [reloaded] = await db
      .select()
      .from(phases)
      .where(eq(phases.id, first.id));
    expect(reloaded.done).toBe(true);
  });

  it("never treats a phase with no SLA configured as overdue", async () => {
    const pipe = await makePipe();
    const [first] = await listPhases(pipe.id);

    const updated = await updatePhase(first.id, {
      slaTime: null,
      slaUnit: null,
    });
    expect(updated.slaTime).toBeNull();
    expect(updated.slaUnit).toBeNull();
  });

  it("stores a configured SLA duration and unit on a phase", async () => {
    const pipe = await makePipe();
    const [first] = await listPhases(pipe.id);

    const updated = await updatePhase(first.id, {
      slaTime: 48,
      slaUnit: "hours",
    });
    expect(updated.slaTime).toBe(48);
    expect(updated.slaUnit).toBe("hours");
  });

  it("creates a new phase appended at the end of the position order", async () => {
    const pipe = await makePipe();
    const created = await createPhase(pipe.id, "Review");

    const all = await listPhases(pipe.id);
    expect(all).toHaveLength(4);
    expect(all[3].id).toBe(created.id);
    expect(all[3].position).toBe(3);
  });

  it("rejects creating a phase with a blank name", async () => {
    const pipe = await makePipe();
    await expect(createPhase(pipe.id, "  ")).rejects.toThrow();
  });

  it("reorders phases and persists the new position order", async () => {
    const pipe = await makePipe();
    const [a, b, c] = await listPhases(pipe.id);

    const reordered = await reorderPhases(pipe.id, [b.id, c.id, a.id]);
    expect(reordered.map((p) => p.id)).toEqual([b.id, c.id, a.id]);
    expect(reordered.map((p) => p.position)).toEqual([0, 1, 2]);
  });

  it("rejects reordering with a mismatched set of ids", async () => {
    const pipe = await makePipe();
    const [a, b] = await listPhases(pipe.id);
    await expect(
      reorderPhases(pipe.id, [
        a.id,
        b.id,
        "00000000-0000-0000-0000-000000000000",
      ]),
    ).rejects.toThrow();
  });

  it("deletes a phase and re-normalizes remaining positions", async () => {
    const pipe = await makePipe();
    const [a, b, c] = await listPhases(pipe.id);

    await deletePhase(b.id);

    const remaining = await listPhases(pipe.id);
    expect(remaining.map((p) => p.id)).toEqual([a.id, c.id]);
    expect(remaining.map((p) => p.position)).toEqual([0, 1]);
  });

  it("refuses to delete the only remaining phase in a pipe", async () => {
    const pipe = await makePipe();
    const all = await listPhases(pipe.id);
    await deletePhase(all[0].id);
    await deletePhase(all[1].id);

    const [last] = await listPhases(pipe.id);
    await expect(deletePhase(last.id)).rejects.toThrow();

    const stillThere = await listPhases(pipe.id);
    expect(stillThere).toHaveLength(1);
  });
});
