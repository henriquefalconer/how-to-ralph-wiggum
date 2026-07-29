import { logAuditEntry } from "@/lib/audit-log";
import { db } from "@/lib/db";
import { phases } from "@/lib/db/schema";
import { asc, count, eq } from "drizzle-orm";

export type Phase = typeof phases.$inferSelect;

export interface PhaseUpdateInput {
  name?: string;
  color?: string;
  description?: string | null;
  done?: boolean;
  allowCardCreation?: boolean;
  collectTaskEmails?: boolean;
  autoAssignUserIds?: string[];
  slaTime?: number | null;
  slaUnit?: "hours" | "days" | null;
}

export async function listPhases(pipeId: string): Promise<Phase[]> {
  return db
    .select()
    .from(phases)
    .where(eq(phases.pipeId, pipeId))
    .orderBy(asc(phases.position));
}

export async function createPhase(
  pipeId: string,
  name: string,
): Promise<Phase> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Phase name is required");
  }

  const [{ value: existingCount }] = await db
    .select({ value: count() })
    .from(phases)
    .where(eq(phases.pipeId, pipeId));

  const [phase] = await db
    .insert(phases)
    .values({ pipeId, name: trimmed, position: existingCount })
    .returning();

  await logAuditEntry({
    pipeId,
    category: "config_change",
    resourceType: "phase",
    messageKey: "phaseCreated",
    params: { phase: phase.name },
  });

  return phase;
}

export async function updatePhase(
  phaseId: string,
  input: PhaseUpdateInput,
): Promise<Phase> {
  if (input.name !== undefined && !input.name.trim()) {
    throw new Error("Phase name is required");
  }

  const [updated] = await db
    .update(phases)
    .set(input)
    .where(eq(phases.id, phaseId))
    .returning();

  if (!updated) {
    throw new Error("Phase not found");
  }

  return updated;
}

export async function reorderPhases(
  pipeId: string,
  orderedIds: string[],
): Promise<Phase[]> {
  const existing = await listPhases(pipeId);
  const existingIds = new Set(existing.map((phase) => phase.id));

  if (
    orderedIds.length !== existing.length ||
    !orderedIds.every((id) => existingIds.has(id))
  ) {
    throw new Error("orderedIds must match the pipe's existing phases exactly");
  }

  await db.transaction(async (tx) => {
    for (const [index, id] of orderedIds.entries()) {
      await tx.update(phases).set({ position: index }).where(eq(phases.id, id));
    }
  });

  return listPhases(pipeId);
}

export async function deletePhase(phaseId: string): Promise<void> {
  const [phase] = await db.select().from(phases).where(eq(phases.id, phaseId));
  if (!phase) {
    throw new Error("Phase not found");
  }

  const siblings = await listPhases(phase.pipeId);
  if (siblings.length <= 1) {
    throw new Error("Cannot delete the only remaining phase in a pipe");
  }

  await db.transaction(async (tx) => {
    await tx.delete(phases).where(eq(phases.id, phaseId));

    const remaining = siblings.filter((sibling) => sibling.id !== phaseId);
    for (const [index, sibling] of remaining.entries()) {
      if (sibling.position !== index) {
        await tx
          .update(phases)
          .set({ position: index })
          .where(eq(phases.id, sibling.id));
      }
    }
  });
}
