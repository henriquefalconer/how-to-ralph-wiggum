import { db } from "@/lib/db";
import {
  webhookDeliveries,
  type webhookScopeTypes,
  webhooks,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export { webhookScopeTypes } from "@/lib/db/schema";

export type Webhook = typeof webhooks.$inferSelect;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type WebhookScopeType = (typeof webhookScopeTypes)[number];

export const WEBHOOK_EVENTS = [
  "card.created",
  "card.moved",
  "card.updated",
  "card.deleted",
  "table.record.created",
  "table.record.updated",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export function isWebhookEvent(value: string): value is WebhookEvent {
  return (WEBHOOK_EVENTS as readonly string[]).includes(value);
}

export async function registerWebhook(
  scopeType: WebhookScopeType,
  scopeId: string,
  url: string,
  events: string[],
): Promise<Webhook> {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    throw new Error("Webhook URL is required");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmedUrl);
  } catch {
    throw new Error("Webhook URL must be a valid URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Webhook URL must use http or https");
  }

  const validEvents = events.filter(isWebhookEvent);
  if (validEvents.length === 0) {
    throw new Error("At least one valid event is required");
  }

  const [webhook] = await db
    .insert(webhooks)
    .values({ scopeType, scopeId, url: trimmedUrl, events: validEvents })
    .returning();

  return webhook;
}

export async function listWebhooks(
  scopeType: WebhookScopeType,
  scopeId: string,
): Promise<Webhook[]> {
  return db
    .select()
    .from(webhooks)
    .where(
      and(eq(webhooks.scopeType, scopeType), eq(webhooks.scopeId, scopeId)),
    );
}

export async function deleteWebhook(id: string): Promise<void> {
  const remaining = await db
    .delete(webhooks)
    .where(eq(webhooks.id, id))
    .returning({ id: webhooks.id });

  if (remaining.length === 0) {
    throw new Error("Webhook not found");
  }
}

/**
 * Delivers `event` to every webhook registered for (scopeType, scopeId) that
 * subscribes to it. Every delivery attempt (success or failure) is logged to
 * webhook_deliveries. Delivery failures (unreachable URL, non-2xx response)
 * are caught and logged, never thrown — they must not block or roll back the
 * action that triggered the event.
 */
export async function triggerWebhookEvent(
  scopeType: WebhookScopeType,
  scopeId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  const subscribed = await listWebhooks(scopeType, scopeId);
  const matching = subscribed.filter((webhook) =>
    webhook.events.includes(event),
  );
  if (matching.length === 0) return;

  const body = JSON.stringify({
    event,
    ...payload,
    timestamp: new Date().toISOString(),
  });

  await Promise.all(
    matching.map(async (webhook) => {
      try {
        const response = await fetch(webhook.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        await db.insert(webhookDeliveries).values({
          webhookId: webhook.id,
          event,
          payload: JSON.parse(body),
          success: response.ok,
          statusCode: response.status,
          error: response.ok ? null : `HTTP ${response.status}`,
        });
      } catch (err) {
        await db.insert(webhookDeliveries).values({
          webhookId: webhook.id,
          event,
          payload: JSON.parse(body),
          success: false,
          statusCode: null,
          error: err instanceof Error ? err.message : "Delivery failed",
        });
      }
    }),
  );
}
