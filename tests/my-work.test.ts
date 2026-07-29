import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db";
import {
  organizations,
  users,
  pipes,
  phases,
  cards,
  cardFieldValues,
  notifications,
} from "@/lib/db/schema";
import {
  getMyWorkCards,
  getMyWorkCounts,
  markAllNotificationsRead,
  getUnreadNotificationCount,
  getUserNotifications,
  createOverdueNotification,
} from "@/lib/my-work";
import { eq } from "drizzle-orm";

describe("My Work", () => {
  let orgId: string;
  let userId: string;
  let pipeId: string;
  let phaseId: string;
  let cardId: string;

  beforeEach(async () => {
    // Clear existing data
    await db.delete(notifications);
    await db.delete(cardFieldValues);
    await db.delete(cards);
    await db.delete(phases);
    await db.delete(pipes);
    await db.delete(users);
    await db.delete(organizations);

    // Create test data
    const orgResult = await db
      .insert(organizations)
      .values({ name: "Test Org" })
      .returning();
    orgId = orgResult[0].id;

    const userResult = await db
      .insert(users)
      .values({
        orgId,
        name: "Test User",
        email: "test@example.com",
        isSelf: true,
      })
      .returning();
    userId = userResult[0].id;

    const pipeResult = await db
      .insert(pipes)
      .values({
        orgId,
        name: "Test Pipe",
        color: "#000000",
      })
      .returning();
    pipeId = pipeResult[0].id;

    const phaseResult = await db
      .insert(phases)
      .values({
        pipeId,
        name: "Test Phase",
        position: 0,
        done: false,
      })
      .returning();
    phaseId = phaseResult[0].id;

    const cardResult = await db
      .insert(cards)
      .values({
        pipeId,
        phaseId,
        title: "Test Card",
      })
      .returning();
    cardId = cardResult[0].id;
  });

  it("returns all assigned cards for all tab", async () => {
    // Add user as assignee
    await db.insert(cardFieldValues).values({
      cardId,
      fieldOwnerType: "phase",
      fieldOwnerId: phaseId,
      fieldId: "assignee_select",
      value: JSON.stringify([userId]),
    });

    const cards = await getMyWorkCards(userId, "all");
    expect(cards).toHaveLength(1);
    expect(cards[0].title).toBe("Test Card");
  });

  it("filters cards due within 7 days for due_soon tab", async () => {
    const now = new Date();
    const dueSoon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Add user as assignee and due date
    await db.insert(cardFieldValues).values([
      {
        cardId,
        fieldOwnerType: "phase",
        fieldOwnerId: phaseId,
        fieldId: "assignee_select",
        value: JSON.stringify([userId]),
      },
      {
        cardId,
        fieldOwnerType: "phase",
        fieldOwnerId: phaseId,
        fieldId: "due_date",
        value: dueSoon.getTime().toString(),
      },
    ]);

    const cards = await getMyWorkCards(userId, "due_soon");
    expect(cards).toHaveLength(1);
    expect(cards[0].dueDate?.getTime()).toBe(dueSoon.getTime());
  });

  it("filters overdue cards (due_date < now)", async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    await db.insert(cardFieldValues).values([
      {
        cardId,
        fieldOwnerType: "phase",
        fieldOwnerId: phaseId,
        fieldId: "assignee_select",
        value: JSON.stringify([userId]),
      },
      {
        cardId,
        fieldOwnerType: "phase",
        fieldOwnerId: phaseId,
        fieldId: "due_date",
        value: yesterday.getTime().toString(),
      },
    ]);

    const cards = await getMyWorkCards(userId, "overdue");
    expect(cards).toHaveLength(1);
  });

  it("returns empty for overdue completed cards", async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Update card to be done
    await db.update(cards).set({ done: true }).where(eq(cards.id, cardId));

    await db.insert(cardFieldValues).values([
      {
        cardId,
        fieldOwnerType: "phase",
        fieldOwnerId: phaseId,
        fieldId: "assignee_select",
        value: JSON.stringify([userId]),
      },
      {
        cardId,
        fieldOwnerType: "phase",
        fieldOwnerId: phaseId,
        fieldId: "due_date",
        value: yesterday.getTime().toString(),
      },
    ]);

    const cards = await getMyWorkCards(userId, "overdue");
    expect(cards).toHaveLength(0);
  });

  it("filters completed cards", async () => {
    // Update card to be done
    await db.update(cards).set({ done: true }).where(eq(cards.id, cardId));

    await db.insert(cardFieldValues).values({
      cardId,
      fieldOwnerType: "phase",
      fieldOwnerId: phaseId,
      fieldId: "assignee_select",
      value: JSON.stringify([userId]),
    });

    const cards = await getMyWorkCards(userId, "completed");
    expect(cards).toHaveLength(1);
  });

  it("returns correct counts per tab", async () => {
    await db.insert(cardFieldValues).values({
      cardId,
      fieldOwnerType: "phase",
      fieldOwnerId: phaseId,
      fieldId: "assignee_select",
      value: JSON.stringify([userId]),
    });

    const counts = await getMyWorkCounts(userId);
    expect(counts.all).toBe(1);
    expect(counts.completed).toBe(0);
  });

  it("creates overdue notification", async () => {
    await createOverdueNotification(userId, cardId, "Test Card");

    const notifs = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId));

    expect(notifs).toHaveLength(1);
    expect(notifs[0].message).toBe('O card "Test Card" está vencido');
    expect(notifs[0].readAt).toBeNull();
  });

  it("does not create duplicate overdue notifications for same card", async () => {
    await createOverdueNotification(userId, cardId, "Test Card");
    await createOverdueNotification(userId, cardId, "Test Card");

    const notifs = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId));

    expect(notifs).toHaveLength(1);
  });

  it("marks all notifications as read", async () => {
    // Create multiple notifications
    await db.insert(notifications).values([
      {
        userId,
        cardId,
        type: "card_overdue",
        message: "Card 1 is overdue",
      },
      {
        userId,
        cardId,
        type: "card_overdue",
        message: "Card 2 is overdue",
      },
    ]);

    await markAllNotificationsRead(userId);

    const unread = await getUnreadNotificationCount(userId);
    expect(unread).toBe(0);
  });

  it("counts unread notifications", async () => {
    await db.insert(notifications).values([
      {
        userId,
        cardId,
        type: "card_overdue",
        message: "Unread notification",
      },
    ]);

    const count = await getUnreadNotificationCount(userId);
    expect(count).toBe(1);
  });

  it("retrieves user notifications ordered by creation time", async () => {
    const now = Date.now();
    await db.insert(notifications).values([
      {
        userId,
        cardId,
        type: "card_overdue",
        message: "First notification",
        createdAt: new Date(now - 2000),
      },
      {
        userId,
        cardId,
        type: "card_overdue",
        message: "Second notification",
        createdAt: new Date(now - 1000),
      },
      {
        userId,
        cardId,
        type: "card_overdue",
        message: "Third notification",
        createdAt: new Date(now),
      },
    ]);

    const notifs = await getUserNotifications(userId);
    expect(notifs).toHaveLength(3);
    expect(notifs[0].message).toBe("Third notification");
    expect(notifs[1].message).toBe("Second notification");
    expect(notifs[2].message).toBe("First notification");
  });

  it("respects limit parameter when retrieving notifications", async () => {
    for (let i = 0; i < 5; i++) {
      await db.insert(notifications).values({
        userId,
        cardId,
        type: "card_overdue",
        message: `Notification ${i}`,
      });
    }

    const notifs = await getUserNotifications(userId, 2);
    expect(notifs).toHaveLength(2);
  });
});
