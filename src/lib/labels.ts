import { db } from "@/lib/db";
import { labels } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";

export type Label = typeof labels.$inferSelect;

const DEFAULT_LABEL_COLOR = "#35FFDD";

export async function createLabel(
  pipeId: string,
  {
    name,
    color = DEFAULT_LABEL_COLOR,
  }: {
    name: string;
    color?: string;
  },
): Promise<Label> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Label name is required");
  }

  const [label] = await db
    .insert(labels)
    .values({
      pipeId,
      name: trimmed,
      color,
    })
    .returning();

  return label;
}

export async function listLabels(pipeId: string): Promise<Label[]> {
  return db
    .select()
    .from(labels)
    .where(eq(labels.pipeId, pipeId))
    .orderBy(asc(labels.createdAt));
}

export async function getLabel(labelId: string): Promise<Label | undefined> {
  const [label] = await db.select().from(labels).where(eq(labels.id, labelId));
  return label;
}

export async function deleteLabel(labelId: string): Promise<void> {
  await db.delete(labels).where(eq(labels.id, labelId));
}

export async function updateLabel(
  labelId: string,
  updates: {
    name?: string;
    color?: string;
  },
): Promise<Label> {
  const label = await getLabel(labelId);
  if (!label) {
    throw new Error(`Label ${labelId} not found`);
  }

  const [updated] = await db
    .update(labels)
    .set({
      name: updates.name !== undefined ? updates.name.trim() : label.name,
      color: updates.color ?? label.color,
    })
    .where(eq(labels.id, labelId))
    .returning();

  return updated;
}
