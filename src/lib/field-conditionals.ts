import { db } from "@/lib/db";
import { fieldConditionals } from "@/lib/db/schema";
import {
  type ConditionGroup,
  type ConditionalAction,
  isConditionalActionType,
  isConditionalOperator,
} from "@/lib/field-conditional-types";
import { asc, eq } from "drizzle-orm";

export {
  FIELD_CONDITIONAL_ACTIONS as fieldConditionalActionTypes,
  FIELD_CONDITIONAL_OPERATORS as fieldConditionalOperators,
  conditionGroupsMatch,
  evaluateConditionals,
  isConditionalActionType,
  isConditionalOperator,
  type ConditionCheck,
  type ConditionGroup,
  type ConditionalAction,
  type ConditionalActionType,
  type ConditionalOperator,
  type FieldConditionalRule,
} from "@/lib/field-conditional-types";

export type FieldConditional = typeof fieldConditionals.$inferSelect;

export interface FieldConditionalInput {
  name: string;
  conditionGroups: ConditionGroup[];
  trueActions: ConditionalAction[];
  falseActions: ConditionalAction[];
}

export interface FieldConditionalUpdateInput {
  name?: string;
  conditionGroups?: ConditionGroup[];
  trueActions?: ConditionalAction[];
  falseActions?: ConditionalAction[];
}

function validateConditionGroups(groups: ConditionGroup[]): void {
  if (groups.length === 0) {
    throw new Error("At least one condition is required");
  }
  for (const group of groups) {
    if (group.length === 0) {
      throw new Error("A condition group cannot be empty");
    }
    for (const check of group) {
      if (!check.fieldId) {
        throw new Error("Condition field is required");
      }
      if (!isConditionalOperator(check.operator)) {
        throw new Error(`Unknown condition operator: ${check.operator}`);
      }
    }
  }
}

function validateActions(actions: ConditionalAction[]): void {
  for (const action of actions) {
    if (!isConditionalActionType(action.action)) {
      throw new Error(`Unknown conditional action: ${action.action}`);
    }
    if (!action.targetFieldId) {
      throw new Error("Target field is required for every action");
    }
  }
}

export async function listFieldConditionals(
  phaseId: string,
): Promise<FieldConditional[]> {
  return db
    .select()
    .from(fieldConditionals)
    .where(eq(fieldConditionals.phaseId, phaseId))
    .orderBy(asc(fieldConditionals.position));
}

export async function getFieldConditional(
  id: string,
): Promise<FieldConditional | null> {
  const [row] = await db
    .select()
    .from(fieldConditionals)
    .where(eq(fieldConditionals.id, id));
  return row ?? null;
}

export async function createFieldConditional(
  phaseId: string,
  input: FieldConditionalInput,
): Promise<FieldConditional> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Conditional name is required");
  }
  validateConditionGroups(input.conditionGroups);
  validateActions(input.trueActions);
  validateActions(input.falseActions);

  const existing = await listFieldConditionals(phaseId);

  const [row] = await db
    .insert(fieldConditionals)
    .values({
      phaseId,
      name,
      position: existing.length,
      conditionGroups: input.conditionGroups,
      trueActions: input.trueActions,
      falseActions: input.falseActions,
    })
    .returning();

  return row;
}

export async function updateFieldConditional(
  id: string,
  input: FieldConditionalUpdateInput,
): Promise<FieldConditional> {
  if (input.name !== undefined && !input.name.trim()) {
    throw new Error("Conditional name is required");
  }
  if (input.conditionGroups !== undefined) {
    validateConditionGroups(input.conditionGroups);
  }
  if (input.trueActions !== undefined) {
    validateActions(input.trueActions);
  }
  if (input.falseActions !== undefined) {
    validateActions(input.falseActions);
  }

  const [updated] = await db
    .update(fieldConditionals)
    .set({
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.conditionGroups !== undefined
        ? { conditionGroups: input.conditionGroups }
        : {}),
      ...(input.trueActions !== undefined
        ? { trueActions: input.trueActions }
        : {}),
      ...(input.falseActions !== undefined
        ? { falseActions: input.falseActions }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(fieldConditionals.id, id))
    .returning();

  if (!updated) {
    throw new Error("Field conditional not found");
  }

  return updated;
}

export async function deleteFieldConditional(id: string): Promise<void> {
  const remaining = await db
    .delete(fieldConditionals)
    .where(eq(fieldConditionals.id, id))
    .returning({ id: fieldConditionals.id });

  if (remaining.length === 0) {
    throw new Error("Field conditional not found");
  }
}
