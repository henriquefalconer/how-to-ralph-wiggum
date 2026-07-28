import { db } from "@/lib/db";
import { fields } from "@/lib/db/schema";
import {
  FIELD_TYPES,
  type FieldOwnerType,
  type FieldType,
  isChoiceFieldType,
  slugify,
} from "@/lib/field-types";
import { and, asc, eq } from "drizzle-orm";

export type Field = typeof fields.$inferSelect;

export {
  FIELD_TYPES,
  isChoiceFieldType,
  isFieldValueEditable,
  slugify,
  type FieldOwnerType,
  type FieldType,
} from "@/lib/field-types";

export interface FieldInput {
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string | null;
  description?: string | null;
  editable?: boolean;
  minimalView?: boolean;
  options?: string[];
  connectorTargetId?: string | null;
}

export interface FieldUpdateInput {
  label?: string;
  required?: boolean;
  help?: string | null;
  description?: string | null;
  editable?: boolean;
  minimalView?: boolean;
  options?: string[];
}

export async function listFields(
  ownerType: FieldOwnerType,
  ownerId: string,
): Promise<Field[]> {
  return db
    .select()
    .from(fields)
    .where(and(eq(fields.ownerType, ownerType), eq(fields.ownerId, ownerId)))
    .orderBy(asc(fields.position));
}

export async function createField(
  ownerType: FieldOwnerType,
  ownerId: string,
  input: FieldInput,
): Promise<Field> {
  const label = input.label.trim();
  if (!label) {
    throw new Error("Field label is required");
  }

  if (!FIELD_TYPES.includes(input.type)) {
    throw new Error(`Unknown field type: ${input.type}`);
  }

  const options = input.options ?? [];
  if (isChoiceFieldType(input.type) && options.length === 0) {
    throw new Error(`Options are required for field type "${input.type}"`);
  }

  const existing = await listFields(ownerType, ownerId);
  const existingIds = new Set(existing.map((field) => field.id));

  const baseId = slugify(label) || "field";
  let id = baseId;
  let suffix = 2;
  while (existingIds.has(id)) {
    id = `${baseId}_${suffix}`;
    suffix += 1;
  }

  const [field] = await db
    .insert(fields)
    .values({
      id,
      ownerType,
      ownerId,
      label,
      type: input.type,
      required: input.required ?? false,
      help: input.help ?? null,
      description: input.description ?? null,
      editable: input.editable ?? true,
      minimalView: input.minimalView ?? false,
      options,
      connectorTargetId: input.connectorTargetId ?? null,
      position: existing.length,
    })
    .returning();

  return field;
}

export async function updateField(
  ownerType: FieldOwnerType,
  ownerId: string,
  fieldId: string,
  input: FieldUpdateInput,
): Promise<Field> {
  if (input.label !== undefined && !input.label.trim()) {
    throw new Error("Field label is required");
  }

  const [existing] = await db
    .select()
    .from(fields)
    .where(
      and(
        eq(fields.ownerType, ownerType),
        eq(fields.ownerId, ownerId),
        eq(fields.id, fieldId),
      ),
    );
  if (!existing) {
    throw new Error("Field not found");
  }

  const nextOptions = input.options ?? existing.options;
  if (
    isChoiceFieldType(existing.type as FieldType) &&
    nextOptions.length === 0
  ) {
    throw new Error(`Options are required for field type "${existing.type}"`);
  }

  const [updated] = await db
    .update(fields)
    .set({
      ...(input.label !== undefined ? { label: input.label.trim() } : {}),
      ...(input.required !== undefined ? { required: input.required } : {}),
      ...(input.help !== undefined ? { help: input.help } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.editable !== undefined ? { editable: input.editable } : {}),
      ...(input.minimalView !== undefined
        ? { minimalView: input.minimalView }
        : {}),
      ...(input.options !== undefined ? { options: input.options } : {}),
    })
    .where(
      and(
        eq(fields.ownerType, ownerType),
        eq(fields.ownerId, ownerId),
        eq(fields.id, fieldId),
      ),
    )
    .returning();

  return updated;
}

export async function deleteField(
  ownerType: FieldOwnerType,
  ownerId: string,
  fieldId: string,
): Promise<void> {
  const remaining = await db
    .delete(fields)
    .where(
      and(
        eq(fields.ownerType, ownerType),
        eq(fields.ownerId, ownerId),
        eq(fields.id, fieldId),
      ),
    )
    .returning({ id: fields.id });

  if (remaining.length === 0) {
    throw new Error("Field not found");
  }
}
