import { db } from "@/lib/db";
import { cards, cardFieldValues, phases, pipes, notifications, users } from "@/lib/db/schema";
import { eq, and, or, gt, lt, sql, isNull } from "drizzle-orm";

export type MyWorkTab = "all" | "due_soon" | "overdue" | "late" | "expired" | "completed";

export interface MyWorkCard {
  id: string;
  title: string;
  pipeId: string;
  pipeName: string;
  phaseId: string;
  phaseName: string;
  dueDate: Date | null;
  createdAt: Date;
  assignedAt: Date;
  currentPhase: string;
  isDone: boolean;
}

// Get assignee_select field values for a card (the field that stores assignees)
async function getCardAssignees(cardId: string): Promise<string[]> {
  const values = await db
    .select({ value: cardFieldValues.value })
    .from(cardFieldValues)
    .where(
      and(
        eq(cardFieldValues.cardId, cardId),
        eq(cardFieldValues.fieldId, "assignee_select")
      )
    );

  if (values.length === 0) return [];
  // The assignee_select field value is stored as JSON array of user IDs
  try {
    return JSON.parse(values[0].value || "[]");
  } catch {
    return [];
  }
}

// Get due_date field value for a card
async function getCardDueDate(cardId: string): Promise<Date | null> {
  const values = await db
    .select({ value: cardFieldValues.value })
    .from(cardFieldValues)
    .where(
      and(
        eq(cardFieldValues.cardId, cardId),
        eq(cardFieldValues.fieldId, "due_date")
      )
    );

  if (values.length === 0) return null;
  const value = values[0].value;
  if (!value) return null;

  try {
    const timestamp = parseInt(value, 10);
    return new Date(timestamp);
  } catch {
    return null;
  }
}

// Get all cards assigned to a user with their metadata
async function getAssignedCards(userId: string): Promise<MyWorkCard[]> {
  const userCards = await db
    .select({
      cardId: cards.id,
      title: cards.title,
      pipeId: cards.pipeId,
      pipeName: pipes.name,
      phaseId: cards.phaseId,
      phaseName: phases.name,
      createdAt: cards.createdAt,
      isDone: cards.done,
    })
    .from(cards)
    .innerJoin(pipes, eq(cards.pipeId, pipes.id))
    .innerJoin(phases, eq(cards.phaseId, phases.id));

  // Filter to only cards assigned to this user
  const assignedCards: MyWorkCard[] = [];

  for (const card of userCards) {
    const assignees = await getCardAssignees(card.cardId);
    if (assignees.includes(userId)) {
      const dueDate = await getCardDueDate(card.cardId);
      assignedCards.push({
        id: card.cardId,
        title: card.title,
        pipeId: card.pipeId,
        pipeName: card.pipeName,
        phaseId: card.phaseId,
        phaseName: card.phaseName,
        dueDate,
        createdAt: card.createdAt,
        assignedAt: new Date(), // Simplified: should be the actual assignment timestamp if available
        currentPhase: card.phaseName,
        isDone: card.isDone,
      });
    }
  }

  return assignedCards;
}

export async function getMyWorkCards(userId: string, tab: MyWorkTab): Promise<MyWorkCard[]> {
  const allCards = await getAssignedCards(userId);
  const now = new Date();

  switch (tab) {
    case "all":
      return allCards;

    case "due_soon": {
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return allCards.filter(
        (c) => c.dueDate && c.dueDate > now && c.dueDate <= sevenDaysFromNow
      );
    }

    case "overdue": {
      return allCards.filter((c) => c.dueDate && c.dueDate < now && !c.isDone);
    }

    case "late": {
      // "Atrasados" are cards where the phase SLA is exceeded
      // For now, return empty as this requires phase SLA calculations
      // TODO: implement based on phase.slaTime and phase.slaUnit
      return [];
    }

    case "expired": {
      // "Expirados" is pipe-level expiration alert
      // TODO: implement based on pipe expiration settings
      return [];
    }

    case "completed": {
      return allCards.filter((c) => c.isDone);
    }

    default:
      return allCards;
  }
}

export async function getMyWorkCounts(userId: string): Promise<Record<MyWorkTab, number>> {
  const counts: Record<MyWorkTab, number> = {
    all: 0,
    due_soon: 0,
    overdue: 0,
    late: 0,
    expired: 0,
    completed: 0,
  };

  for (const tab of Object.keys(counts) as MyWorkTab[]) {
    const cards = await getMyWorkCards(userId, tab);
    counts[tab] = cards.length;
  }

  return counts;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.userId, userId),
        isNull(notifications.readAt)
      )
    );
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        isNull(notifications.readAt)
      )
    );

  return result[0]?.count || 0;
}

export async function getUserNotifications(userId: string, limit: number = 20): Promise<typeof notifications.$inferSelect[]> {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(sql`${notifications.createdAt} DESC`)
    .limit(limit);
}

export async function createOverdueNotification(
  userId: string,
  cardId: string,
  cardTitle: string
): Promise<void> {
  const message = `O card "${cardTitle}" está vencido`;

  // Check if we already created this notification for this card
  const existing = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.cardId, cardId),
        eq(notifications.type, "card_overdue")
      )
    );

  if (existing.length === 0) {
    await db.insert(notifications).values({
      userId,
      cardId,
      type: "card_overdue",
      message,
    });
  }
}
