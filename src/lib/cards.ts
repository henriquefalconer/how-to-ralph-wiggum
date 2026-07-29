import { logAuditEntry } from "@/lib/audit-log";
import { executeAutomationsForTrigger } from "@/lib/automations";
import { db } from "@/lib/db";
import {
  cardFieldValues,
  cardTransitions,
  cards,
  phases,
  pipes,
} from "@/lib/db/schema";
import {
  type FieldConditional,
  listFieldConditionals,
} from "@/lib/field-conditionals";
import { listFields } from "@/lib/fields";
import {
  assertCanDeleteCard,
  assertCanEditFieldValues,
  getMemberRole,
} from "@/lib/pipe-members";
import { triggerWebhookEvent } from "@/lib/webhooks";
import { and, asc, desc, eq } from "drizzle-orm";

export type Card = typeof cards.$inferSelect;
export type CardTransition = typeof cardTransitions.$inferSelect;

export interface CardWithCounts extends Card {
  phaseId: string;
}

export async function listStartFormFields(pipeId: string) {
  return listFields("start_form", pipeId);
}

async function computeTitle(
  pipeId: string,
  values: Record<string, string>,
): Promise<string> {
  const [pipe] = await db.select().from(pipes).where(eq(pipes.id, pipeId));
  const startFormFields = await listFields("start_form", pipeId);

  const titleFieldId = pipe?.titleFieldId ?? startFormFields[0]?.id ?? null;
  if (!titleFieldId) return "";

  return (values[titleFieldId] ?? "").trim();
}

export async function listCardsForPipe(pipeId: string): Promise<Card[]> {
  return db
    .select()
    .from(cards)
    .where(eq(cards.pipeId, pipeId))
    .orderBy(desc(cards.createdAt));
}

export async function createCard(
  pipeId: string,
  phaseId: string,
  values: Record<string, string>,
): Promise<Card> {
  const [phase] = await db
    .select()
    .from(phases)
    .where(and(eq(phases.id, phaseId), eq(phases.pipeId, pipeId)));
  if (!phase) {
    throw new Error("Phase not found for this pipe");
  }

  const startFormFields = await listFields("start_form", pipeId);
  for (const field of startFormFields) {
    if (field.required && !(values[field.id] ?? "").trim()) {
      throw new Error(`"${field.label}" is required`);
    }
  }

  const title = await computeTitle(pipeId, values);
  if (!title) {
    throw new Error("Card title is required");
  }

  const [card] = await db
    .insert(cards)
    .values({ pipeId, phaseId, title, done: phase.done })
    .returning();

  if (startFormFields.length > 0) {
    await db.insert(cardFieldValues).values(
      startFormFields.map((field) => ({
        cardId: card.id,
        fieldOwnerType: "start_form" as const,
        fieldOwnerId: pipeId,
        fieldId: field.id,
        value: values[field.id] ?? "",
      })),
    );
  }

  await triggerWebhookEvent("pipe", pipeId, "card.created", {
    cardId: card.id,
    phaseId: card.phaseId,
    title: card.title,
  });

  await logAuditEntry({
    pipeId,
    category: "card_activity",
    resourceType: "card",
    messageKey: "cardCreated",
    params: { card: card.title },
  });

  return card;
}

export interface CardDetail {
  card: Card;
  pipe: typeof pipes.$inferSelect;
  phase: typeof phases.$inferSelect;
  nextPhase: typeof phases.$inferSelect | null;
  pipePhases: (typeof phases.$inferSelect)[];
  startForm: {
    field: Awaited<ReturnType<typeof listFields>>[number];
    value: string;
  }[];
  phaseFields: {
    field: Awaited<ReturnType<typeof listFields>>[number];
    value: string;
  }[];
  phaseFieldConditionals: FieldConditional[];
  history: CardTransition[];
}

export async function getCardDetail(
  cardId: string,
): Promise<CardDetail | null> {
  const [card] = await db.select().from(cards).where(eq(cards.id, cardId));
  if (!card) return null;

  const [pipe] = await db.select().from(pipes).where(eq(pipes.id, card.pipeId));
  const [phase] = await db
    .select()
    .from(phases)
    .where(eq(phases.id, card.phaseId));
  if (!pipe || !phase) return null;

  const pipePhases = await db
    .select()
    .from(phases)
    .where(eq(phases.pipeId, pipe.id))
    .orderBy(asc(phases.position));
  const currentIndex = pipePhases.findIndex((p) => p.id === phase.id);
  const nextPhase =
    currentIndex >= 0 && currentIndex < pipePhases.length - 1
      ? pipePhases[currentIndex + 1]
      : null;

  const startFormFields = await listFields("start_form", pipe.id);
  const phaseFieldsList = await listFields("phase", phase.id);
  const phaseFieldConditionals = await listFieldConditionals(phase.id);

  const values = await db
    .select()
    .from(cardFieldValues)
    .where(eq(cardFieldValues.cardId, cardId));
  const valueMap = new Map(
    values.map((v) => [
      `${v.fieldOwnerType}:${v.fieldOwnerId}:${v.fieldId}`,
      v.value,
    ]),
  );

  const startForm = startFormFields.map((field) => ({
    field,
    value: valueMap.get(`start_form:${pipe.id}:${field.id}`) ?? "",
  }));
  const phaseFieldsOut = phaseFieldsList.map((field) => ({
    field,
    value: valueMap.get(`phase:${phase.id}:${field.id}`) ?? "",
  }));

  const history = await db
    .select()
    .from(cardTransitions)
    .where(eq(cardTransitions.cardId, cardId))
    .orderBy(asc(cardTransitions.movedAt));

  return {
    card,
    pipe,
    phase,
    nextPhase,
    pipePhases,
    startForm,
    phaseFields: phaseFieldsOut,
    phaseFieldConditionals,
    history,
  };
}

export async function moveCardToPhase(
  cardId: string,
  toPhaseId: string,
): Promise<Card> {
  const [card] = await db.select().from(cards).where(eq(cards.id, cardId));
  if (!card) {
    throw new Error("Card not found");
  }

  const [toPhase] = await db
    .select()
    .from(phases)
    .where(and(eq(phases.id, toPhaseId), eq(phases.pipeId, card.pipeId)));
  if (!toPhase) {
    throw new Error("Target phase not found for this pipe");
  }

  if (toPhase.id === card.phaseId) {
    return card;
  }

  const fromPhaseId = card.phaseId;

  const [updated] = await db.transaction(async (tx) => {
    const [updatedCard] = await tx
      .update(cards)
      .set({ phaseId: toPhaseId, done: toPhase.done, updatedAt: new Date() })
      .where(eq(cards.id, cardId))
      .returning();

    await tx.insert(cardTransitions).values({
      cardId,
      fromPhaseId,
      toPhaseId,
    });

    return [updatedCard];
  });

  await triggerWebhookEvent("pipe", card.pipeId, "card.moved", {
    cardId,
    fromPhaseId,
    toPhaseId,
  });

  const [fromPhase] = await db
    .select({ name: phases.name })
    .from(phases)
    .where(eq(phases.id, fromPhaseId));

  await logAuditEntry({
    pipeId: card.pipeId,
    category: "card_activity",
    resourceType: "card",
    messageKey: "cardMoved",
    params: {
      card: updated.title,
      from: fromPhase?.name ?? "",
      to: toPhase.name,
    },
  });

  await executeAutomationsForTrigger(card.pipeId, "card_entered_phase", {
    pipeId: card.pipeId,
    cardId,
    cardTitle: updated.title,
    phaseId: toPhaseId,
  });

  return updated;
}

export async function setPhaseFieldValue(
  cardId: string,
  fieldId: string,
  value: string,
): Promise<void> {
  const [card] = await db.select().from(cards).where(eq(cards.id, cardId));
  if (!card) {
    throw new Error("Card not found");
  }

  const phaseFields = await listFields("phase", card.phaseId);
  const field = phaseFields.find((f) => f.id === fieldId);
  if (!field) {
    throw new Error("Field not found on the card's current phase");
  }

  await db
    .insert(cardFieldValues)
    .values({
      cardId,
      fieldOwnerType: "phase",
      fieldOwnerId: card.phaseId,
      fieldId,
      value,
      filledAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        cardFieldValues.cardId,
        cardFieldValues.fieldOwnerType,
        cardFieldValues.fieldOwnerId,
        cardFieldValues.fieldId,
      ],
      set: { value, filledAt: new Date() },
    });

  await triggerWebhookEvent("pipe", card.pipeId, "card.updated", {
    cardId,
    fieldId,
    value,
  });

  await logAuditEntry({
    pipeId: card.pipeId,
    category: "card_activity",
    resourceType: "card",
    messageKey: "cardFieldUpdated",
    params: { card: card.title, field: field.label },
  });
}

export async function updateCardFieldValue(
  cardId: string,
  fieldId: string,
  value: string,
  actingUserId: string,
): Promise<void> {
  const [card] = await db.select().from(cards).where(eq(cards.id, cardId));
  if (!card) {
    throw new Error("Card not found");
  }

  const role = await getMemberRole(card.pipeId, actingUserId);
  assertCanEditFieldValues(role);

  return setPhaseFieldValue(cardId, fieldId, value);
}

export async function deleteCard(
  cardId: string,
  actingUserId: string,
): Promise<void> {
  const [card] = await db.select().from(cards).where(eq(cards.id, cardId));
  if (!card) {
    throw new Error("Card not found");
  }

  const [pipe] = await db
    .select({ restrictDeleteToAdmin: pipes.restrictDeleteToAdmin })
    .from(pipes)
    .where(eq(pipes.id, card.pipeId));

  const role = await getMemberRole(card.pipeId, actingUserId);
  assertCanDeleteCard(role, pipe?.restrictDeleteToAdmin ?? false);

  await db.delete(cards).where(eq(cards.id, cardId));

  await triggerWebhookEvent("pipe", card.pipeId, "card.deleted", {
    cardId,
  });

  await logAuditEntry({
    pipeId: card.pipeId,
    category: "card_activity",
    resourceType: "card",
    messageKey: "cardDeleted",
    params: { card: card.title },
    actorUserId: actingUserId,
  });
}
