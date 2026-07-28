import { createCard, moveCardToPhase } from "@/lib/cards";
import { db } from "@/lib/db";
import {
  organizations,
  phases,
  webhookDeliveries,
  webhooks,
} from "@/lib/db/schema";
import { createField } from "@/lib/fields";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { createPipe } from "@/lib/pipes";
import { createRecord, createTable } from "@/lib/tables";
import {
  deleteWebhook,
  listWebhooks,
  registerWebhook,
  triggerWebhookEvent,
} from "@/lib/webhooks";
import { asc, eq } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

function jsonResponse(status: number) {
  return { ok: status >= 200 && status < 300, status } as Response;
}

async function pipePhases(pipeId: string) {
  return db
    .select()
    .from(phases)
    .where(eq(phases.pipeId, pipeId))
    .orderBy(asc(phases.position));
}

describe("webhooks", () => {
  let orgId: string;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    const [org] = await db
      .insert(organizations)
      .values({ name: "Test Org (webhooks.test.ts)" })
      .returning();
    orgId = org.id;
  });

  afterAll(async () => {
    await db.delete(organizations).where(eq(organizations.id, orgId));
  });

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(jsonResponse(200));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function makePipe(name: string) {
    return createPipe(orgId, name, dictionaries.en.defaultPhase);
  }

  it("rejects registering a webhook with an invalid URL", async () => {
    await expect(
      registerWebhook("org", orgId, "not-a-url", ["card.moved"]),
    ).rejects.toThrow(/url/i);
  });

  it("rejects registering a webhook with no valid events", async () => {
    await expect(
      registerWebhook("org", orgId, "https://example.com/hook", [
        "not.a.real.event",
      ]),
    ).rejects.toThrow(/event/i);
  });

  it("registers and lists webhooks scoped to (scopeType, scopeId)", async () => {
    const webhook = await registerWebhook(
      "org",
      orgId,
      "https://example.com/hook-a",
      ["card.moved"],
    );
    const otherOrgId = "00000000-0000-0000-0000-000000000000";
    await registerWebhook("org", otherOrgId, "https://example.com/hook-b", [
      "card.moved",
    ]);

    const scoped = await listWebhooks("org", orgId);
    expect(scoped.map((w) => w.id)).toEqual([webhook.id]);

    await deleteWebhook(webhook.id);
    await db.delete(webhooks).where(eq(webhooks.scopeId, otherOrgId));
  });

  it("deleting a webhook that doesn't exist throws", async () => {
    await expect(
      deleteWebhook("00000000-0000-0000-0000-000000000000"),
    ).rejects.toThrow(/not found/i);
  });

  it("moving a card triggers a webhook POST with cardId/fromPhaseId/toPhaseId/timestamp", async () => {
    const pipe = await makePipe("Webhook Move Pipe");
    const [firstPhase, secondPhase] = await pipePhases(pipe.id);
    const nameField = await createField("start_form", pipe.id, {
      label: "Name",
      type: "short_text",
    });
    const card = await createCard(pipe.id, firstPhase.id, {
      [nameField.id]: "Ada Lovelace",
    });
    fetchMock.mockClear();

    const webhook = await registerWebhook(
      "pipe",
      pipe.id,
      "https://example.com/webhook",
      ["card.moved"],
    );

    await moveCardToPhase(card.id, secondPhase.id);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://example.com/webhook");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      event: "card.moved",
      cardId: card.id,
      fromPhaseId: firstPhase.id,
      toPhaseId: secondPhase.id,
    });
    expect(typeof body.timestamp).toBe("string");

    const deliveries = await db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.webhookId, webhook.id));
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]).toMatchObject({ success: true, statusCode: 200 });
  });

  it("does not fire a webhook subscribed to a different event", async () => {
    const pipe = await makePipe("Webhook Wrong Event Pipe");
    const [firstPhase, secondPhase] = await pipePhases(pipe.id);
    const nameField = await createField("start_form", pipe.id, {
      label: "Name",
      type: "short_text",
    });
    const card = await createCard(pipe.id, firstPhase.id, {
      [nameField.id]: "Grace Hopper",
    });
    fetchMock.mockClear();

    await registerWebhook("pipe", pipe.id, "https://example.com/webhook", [
      "card.created",
    ]);

    await moveCardToPhase(card.id, secondPhase.id);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("an unreachable webhook URL logs a failed delivery without blocking the triggering action", async () => {
    const pipe = await makePipe("Webhook Unreachable Pipe");
    const [firstPhase, secondPhase] = await pipePhases(pipe.id);
    const nameField = await createField("start_form", pipe.id, {
      label: "Name",
      type: "short_text",
    });
    const card = await createCard(pipe.id, firstPhase.id, {
      [nameField.id]: "Katherine Johnson",
    });

    const webhook = await registerWebhook(
      "pipe",
      pipe.id,
      "https://unreachable.example.invalid/webhook",
      ["card.moved"],
    );
    fetchMock.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const moved = await moveCardToPhase(card.id, secondPhase.id);
    expect(moved.phaseId).toBe(secondPhase.id);

    const deliveries = await db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.webhookId, webhook.id));
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]).toMatchObject({
      success: false,
      statusCode: null,
      error: "ECONNREFUSED",
    });
  });

  it("creating a table record triggers a table-scoped webhook", async () => {
    const table = await createTable(orgId, "Webhook Table");
    const titleField = await createField("table", table.id, {
      label: "Title",
      type: "short_text",
    });
    fetchMock.mockClear();

    await registerWebhook("table", table.id, "https://example.com/records", [
      "table.record.created",
    ]);

    const record = await createRecord(table.id, {
      [titleField.id]: "First record",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      event: "table.record.created",
      recordId: record.record.id,
    });
  });

  it("triggering an event with no registered webhooks does nothing", async () => {
    const pipe = await makePipe("No Webhooks Pipe");
    await triggerWebhookEvent("pipe", pipe.id, "card.moved", {
      cardId: "x",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
