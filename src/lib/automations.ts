import {
  AUTOMATION_ACTION_TYPES,
  AUTOMATION_TRIGGER_TYPES,
  type AutomationActionType,
  type AutomationTriggerType,
  isAutomationActionType,
  isAutomationTriggerType,
} from "@/lib/automation-types";
import { db } from "@/lib/db";
import {
  automationRuns,
  automations,
  cardFieldValues,
  fields,
  phases,
} from "@/lib/db/schema";
import { triggerWebhookEvent } from "@/lib/webhooks";
import { and, desc, eq } from "drizzle-orm";

export {
  AUTOMATION_ACTION_TYPES as automationActionTypes,
  AUTOMATION_TRIGGER_TYPES as automationTriggerTypes,
  isAutomationActionType,
  isAutomationTriggerType,
  type AutomationActionType,
  type AutomationTriggerType,
} from "@/lib/automation-types";

export type Automation = typeof automations.$inferSelect;
export type AutomationRun = typeof automationRuns.$inferSelect;

export interface UpdateFieldActionConfig {
  targetFieldOwnerType: "start_form" | "phase";
  targetFieldOwnerId: string;
  targetFieldId: string;
  value: string;
}

export interface AutomationInput {
  name: string;
  enabled?: boolean;
  triggerType: AutomationTriggerType;
  triggerConfig: Record<string, unknown>;
  actionType: AutomationActionType;
  actionConfig: Record<string, unknown>;
}

export interface AutomationUpdateInput {
  name?: string;
  enabled?: boolean;
  triggerConfig?: Record<string, unknown>;
  actionConfig?: Record<string, unknown>;
}

function validateActionConfig(
  actionType: AutomationActionType,
  actionConfig: Record<string, unknown>,
): void {
  if (actionType !== "update_field") return;

  const config = actionConfig as Partial<UpdateFieldActionConfig>;
  if (
    config.targetFieldOwnerType !== "start_form" &&
    config.targetFieldOwnerType !== "phase"
  ) {
    throw new Error("targetFieldOwnerType must be 'start_form' or 'phase'");
  }
  if (!config.targetFieldOwnerId) {
    throw new Error("targetFieldOwnerId is required");
  }
  if (!config.targetFieldId) {
    throw new Error("targetFieldId is required");
  }
}

function validateTriggerConfig(
  triggerType: AutomationTriggerType,
  triggerConfig: Record<string, unknown>,
): void {
  if (
    (triggerType === "card_entered_phase" ||
      triggerType === "card_exited_phase") &&
    typeof triggerConfig.phaseId !== "string"
  ) {
    throw new Error("phaseId is required for this trigger type");
  }
}

export async function listAutomations(pipeId: string): Promise<Automation[]> {
  return db
    .select()
    .from(automations)
    .where(eq(automations.pipeId, pipeId))
    .orderBy(desc(automations.createdAt));
}

export async function getAutomation(id: string): Promise<Automation | null> {
  const [automation] = await db
    .select()
    .from(automations)
    .where(eq(automations.id, id));
  return automation ?? null;
}

export async function createAutomation(
  pipeId: string,
  input: AutomationInput,
): Promise<Automation> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Automation name is required");
  }
  if (!isAutomationTriggerType(input.triggerType)) {
    throw new Error(`Unknown trigger type: ${input.triggerType}`);
  }
  if (!isAutomationActionType(input.actionType)) {
    throw new Error(`Unknown action type: ${input.actionType}`);
  }
  validateTriggerConfig(input.triggerType, input.triggerConfig);
  validateActionConfig(input.actionType, input.actionConfig);

  const [automation] = await db
    .insert(automations)
    .values({
      pipeId,
      name,
      enabled: input.enabled ?? true,
      triggerType: input.triggerType,
      triggerConfig: input.triggerConfig,
      actionType: input.actionType,
      actionConfig: input.actionConfig,
    })
    .returning();

  return automation;
}

export async function updateAutomation(
  id: string,
  input: AutomationUpdateInput,
): Promise<Automation> {
  const existing = await getAutomation(id);
  if (!existing) {
    throw new Error("Automation not found");
  }
  if (input.name !== undefined && !input.name.trim()) {
    throw new Error("Automation name is required");
  }
  if (input.triggerConfig !== undefined) {
    validateTriggerConfig(
      existing.triggerType as AutomationTriggerType,
      input.triggerConfig,
    );
  }
  if (input.actionConfig !== undefined) {
    validateActionConfig(
      existing.actionType as AutomationActionType,
      input.actionConfig,
    );
  }

  const [updated] = await db
    .update(automations)
    .set({
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      ...(input.triggerConfig !== undefined
        ? { triggerConfig: input.triggerConfig }
        : {}),
      ...(input.actionConfig !== undefined
        ? { actionConfig: input.actionConfig }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(automations.id, id))
    .returning();

  return updated;
}

export async function deleteAutomation(id: string): Promise<void> {
  const remaining = await db
    .delete(automations)
    .where(eq(automations.id, id))
    .returning({ id: automations.id });

  if (remaining.length === 0) {
    throw new Error("Automation not found");
  }
}

export async function duplicateAutomation(id: string): Promise<Automation> {
  const existing = await getAutomation(id);
  if (!existing) {
    throw new Error("Automation not found");
  }

  const [copy] = await db
    .insert(automations)
    .values({
      pipeId: existing.pipeId,
      name: `${existing.name} (copy)`,
      enabled: existing.enabled,
      triggerType: existing.triggerType,
      triggerConfig: existing.triggerConfig,
      actionType: existing.actionType,
      actionConfig: existing.actionConfig,
    })
    .returning();

  return copy;
}

export interface AutomationRunWithAutomation extends AutomationRun {
  automationName: string;
}

export async function listAutomationRuns(
  pipeId: string,
): Promise<AutomationRunWithAutomation[]> {
  const rows = await db
    .select({
      id: automationRuns.id,
      automationId: automationRuns.automationId,
      cardId: automationRuns.cardId,
      cardTitle: automationRuns.cardTitle,
      status: automationRuns.status,
      message: automationRuns.message,
      startedAt: automationRuns.startedAt,
      automationName: automations.name,
    })
    .from(automationRuns)
    .innerJoin(automations, eq(automationRuns.automationId, automations.id))
    .where(eq(automations.pipeId, pipeId))
    .orderBy(desc(automationRuns.startedAt));

  return rows;
}

interface TriggerContext {
  pipeId: string;
  cardId: string;
  cardTitle: string;
  phaseId?: string;
}

function resolveCardAttribute(
  attribute: string,
  context: TriggerContext,
): string {
  switch (attribute) {
    case "title":
      return context.cardTitle;
    case "id":
      return context.cardId;
    default:
      return "";
  }
}

async function resolveTokens(
  value: string,
  context: TriggerContext,
): Promise<string> {
  const tokenRegex = /\{\{([^}]+)\}\}/g;
  const matches = [...value.matchAll(tokenRegex)];
  if (matches.length === 0) return value;

  const cardValues = await db
    .select()
    .from(cardFieldValues)
    .where(eq(cardFieldValues.cardId, context.cardId));
  const valueMap = new Map(
    cardValues.map((v) => [
      `${v.fieldOwnerType}:${v.fieldOwnerId}:${v.fieldId}`,
      v.value,
    ]),
  );

  let result = value;
  for (const match of matches) {
    const token = match[1].trim();
    const dotIndex = token.indexOf(".");
    let resolved = "";
    if (dotIndex !== -1) {
      const prefix = token.slice(0, dotIndex);
      const fieldId = token.slice(dotIndex + 1);
      if (prefix === "start_form") {
        resolved =
          valueMap.get(`start_form:${context.pipeId}:${fieldId}`) ?? "";
      } else if (prefix === "card") {
        resolved = resolveCardAttribute(fieldId, context);
      } else {
        resolved = valueMap.get(`phase:${prefix}:${fieldId}`) ?? "";
      }
    }
    result = result.split(match[0]).join(resolved);
  }
  return result;
}

async function executeUpdateFieldAction(
  actionConfig: Record<string, unknown>,
  context: TriggerContext,
): Promise<void> {
  const config = actionConfig as unknown as UpdateFieldActionConfig;

  if (config.targetFieldOwnerType === "phase") {
    const [phase] = await db
      .select()
      .from(phases)
      .where(eq(phases.id, config.targetFieldOwnerId));
    if (!phase) {
      throw new Error("Target phase no longer exists");
    }
  }

  const [field] = await db
    .select()
    .from(fields)
    .where(
      and(
        eq(fields.ownerType, config.targetFieldOwnerType),
        eq(fields.ownerId, config.targetFieldOwnerId),
        eq(fields.id, config.targetFieldId),
      ),
    );
  if (!field) {
    throw new Error("Target field no longer exists");
  }

  const resolvedValue = await resolveTokens(config.value ?? "", context);

  await db
    .insert(cardFieldValues)
    .values({
      cardId: context.cardId,
      fieldOwnerType: config.targetFieldOwnerType,
      fieldOwnerId: config.targetFieldOwnerId,
      fieldId: config.targetFieldId,
      value: resolvedValue,
      filledAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        cardFieldValues.cardId,
        cardFieldValues.fieldOwnerType,
        cardFieldValues.fieldOwnerId,
        cardFieldValues.fieldId,
      ],
      set: { value: resolvedValue, filledAt: new Date() },
    });

  await triggerWebhookEvent("pipe", context.pipeId, "card.updated", {
    cardId: context.cardId,
    fieldId: config.targetFieldId,
    value: resolvedValue,
  });
}

async function executeAction(
  automation: Automation,
  context: TriggerContext,
): Promise<void> {
  switch (automation.actionType as AutomationActionType) {
    case "update_field":
      return executeUpdateFieldAction(automation.actionConfig, context);
    default:
      throw new Error(
        `Action type "${automation.actionType}" is not yet supported`,
      );
  }
}

function triggerMatches(
  automation: Automation,
  triggerType: AutomationTriggerType,
  context: TriggerContext,
): boolean {
  if (
    triggerType === "card_entered_phase" ||
    triggerType === "card_exited_phase"
  ) {
    const config = automation.triggerConfig as { phaseId?: string };
    return config.phaseId === context.phaseId;
  }
  return true;
}

/**
 * Runs every enabled automation in `pipeId` whose trigger matches
 * (triggerType, context), logging one automation_runs row per attempt.
 * Action failures (e.g. a deleted target phase/field) are caught and logged
 * with status "error" rather than thrown — a broken automation must not
 * block the card action that fired it.
 */
export async function executeAutomationsForTrigger(
  pipeId: string,
  triggerType: AutomationTriggerType,
  context: TriggerContext,
): Promise<void> {
  const candidates = await db
    .select()
    .from(automations)
    .where(
      and(
        eq(automations.pipeId, pipeId),
        eq(automations.triggerType, triggerType),
        eq(automations.enabled, true),
      ),
    );

  const matching = candidates.filter((automation) =>
    triggerMatches(automation, triggerType, context),
  );

  for (const automation of matching) {
    try {
      await executeAction(automation, context);
      await db.insert(automationRuns).values({
        automationId: automation.id,
        cardId: context.cardId,
        cardTitle: context.cardTitle,
        status: "success",
        message: "Automação executada com sucesso.",
      });
    } catch (err) {
      await db.insert(automationRuns).values({
        automationId: automation.id,
        cardId: context.cardId,
        cardTitle: context.cardTitle,
        status: "error",
        message: err instanceof Error ? err.message : "Automation failed",
      });
    }
  }
}
