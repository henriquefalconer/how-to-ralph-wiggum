import {
  auditLogToCsv,
  listAuditLog,
  renderAuditMessage,
} from "@/lib/audit-log";
import { createAutomation } from "@/lib/automations";
import { createCard, deleteCard, moveCardToPhase } from "@/lib/cards";
import { db } from "@/lib/db";
import { organizations, phases } from "@/lib/db/schema";
import { createField } from "@/lib/fields";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { createPhase } from "@/lib/phases";
import { ensureSelfMembership } from "@/lib/pipe-members";
import { createPipe, updatePipeSettings } from "@/lib/pipes";
import { asc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

async function pipePhases(pipeId: string) {
  return db
    .select()
    .from(phases)
    .where(eq(phases.pipeId, pipeId))
    .orderBy(asc(phases.position));
}

describe("audit log", () => {
  let orgId: string;

  beforeAll(async () => {
    const [org] = await db
      .insert(organizations)
      .values({ name: "Test Org (audit-log.test.ts)" })
      .returning();
    orgId = org.id;
  });

  afterAll(async () => {
    await db.delete(organizations).where(eq(organizations.id, orgId));
  });

  async function pipeWithTitleField(name: string) {
    const pipe = await createPipe(orgId, name, dictionaries.en.defaultPhase);
    const field = await createField("start_form", pipe.id, {
      label: "Requester name",
      type: "short_text",
    });
    await updatePipeSettings(pipe.id, { titleFieldId: field.id });
    return { pipe, field };
  }

  it("logs a card move under card_activity with both phase names in the message", async () => {
    const { pipe, field } = await pipeWithTitleField("Card move log");
    const [inbox, doing] = await pipePhases(pipe.id);
    const card = await createCard(pipe.id, inbox.id, {
      [field.id]: "João Silva",
    });

    await moveCardToPhase(card.id, doing.id);

    const entries = await listAuditLog(pipe.id, { category: "card_activity" });
    const move = entries.find((e) => e.messageKey === "cardMoved");

    expect(move).toBeDefined();
    expect(move?.category).toBe("card_activity");
    expect(move?.resourceType).toBe("card");
    expect(move?.message).toContain(inbox.name);
    expect(move?.message).toContain(doing.name);
    expect(move?.message).toContain("João Silva");
  });

  it("logs a pipe settings change under config_change with the old and new value", async () => {
    const pipe = await createPipe(
      orgId,
      "Settings log",
      dictionaries.en.defaultPhase,
    );
    const field = await createField("start_form", pipe.id, {
      label: "Requester name",
      type: "short_text",
    });

    await updatePipeSettings(pipe.id, { titleFieldId: field.id });

    const config = await listAuditLog(pipe.id, { category: "config_change" });
    const change = config.find(
      (e) =>
        e.messageKey === "pipeSettingUpdated" &&
        e.messageParams.setting === "titleFieldId",
    );

    expect(change).toBeDefined();
    expect(change?.resourceType).toBe("pipe");
    expect(change?.messageParams.from).toBe(
      dictionaries.en.auditLog.emptyValue,
    );
    expect(change?.messageParams.to).toBe("Requester name");
    expect(change?.message).toContain("Requester name");

    // A settings change must never leak into the card-activity tab.
    const cardActivity = await listAuditLog(pipe.id, {
      category: "card_activity",
    });
    expect(cardActivity.some((e) => e.id === change?.id)).toBe(false);
  });

  it("records 'created this pipe' so a brand new pipe's log is never empty", async () => {
    const pipe = await createPipe(
      orgId,
      "Fresh pipe",
      dictionaries.en.defaultPhase,
    );

    const entries = await listAuditLog(pipe.id);
    expect(entries).toHaveLength(1);
    expect(entries[0].messageKey).toBe("pipeCreated");
    expect(entries[0].category).toBe("config_change");
    expect(entries[0].message).toBe(
      dictionaries.en.auditLog.messages.pipeCreated,
    );
  });

  it("returns entries newest-first", async () => {
    const { pipe, field } = await pipeWithTitleField("Ordering");
    const [inbox, doing] = await pipePhases(pipe.id);
    const card = await createCard(pipe.id, inbox.id, { [field.id]: "Ana" });
    await moveCardToPhase(card.id, doing.id);

    const entries = await listAuditLog(pipe.id);
    const timestamps = entries.map((e) => e.occurredAt.getTime());
    const sorted = [...timestamps].sort((a, b) => b - a);
    expect(timestamps).toEqual(sorted);
    expect(entries[entries.length - 1].messageKey).toBe("pipeCreated");
  });

  it("filters by author, matching name or email", async () => {
    const pipe = await createPipe(
      orgId,
      "Author filter",
      dictionaries.en.defaultPhase,
    );
    const self = await ensureSelfMembership(orgId, pipe.id);

    const byName = await listAuditLog(pipe.id, {
      author: self.user.name.slice(0, 3).toLowerCase(),
    });
    expect(byName.length).toBeGreaterThan(0);
    expect(byName.every((e) => e.actorName === self.user.name)).toBe(true);

    const byEmail = await listAuditLog(pipe.id, { author: self.user.email });
    expect(byEmail.length).toBe(byName.length);

    const noMatch = await listAuditLog(pipe.id, {
      author: "nobody-by-this-name",
    });
    expect(noMatch).toHaveLength(0);
  });

  it("logs card creation and deletion under card_activity", async () => {
    const { pipe, field } = await pipeWithTitleField("Card lifecycle");
    const self = await ensureSelfMembership(orgId, pipe.id);
    const [inbox] = await pipePhases(pipe.id);
    const card = await createCard(pipe.id, inbox.id, { [field.id]: "Bruno" });

    await deleteCard(card.id, self.userId);

    const entries = await listAuditLog(pipe.id, { category: "card_activity" });
    const keys = entries.map((e) => e.messageKey);
    expect(keys).toContain("cardCreated");
    expect(keys).toContain("cardDeleted");
    expect(
      entries.find((e) => e.messageKey === "cardDeleted")?.message,
    ).toContain("Bruno");
    // The card row is gone but its history survives.
    expect(entries.every((e) => e.pipeId === pipe.id)).toBe(true);
  });

  it("logs automation creation with its trigger and action names", async () => {
    const pipe = await createPipe(
      orgId,
      "Automation log",
      dictionaries.en.defaultPhase,
    );
    const [, doing] = await pipePhases(pipe.id);
    const field = await createField("phase", doing.id, {
      label: "Owner",
      type: "short_text",
    });

    await createAutomation(pipe.id, {
      name: "Sync requester name on move to Doing",
      triggerType: "card_entered_phase",
      triggerConfig: { phaseId: doing.id },
      actionType: "update_field",
      actionConfig: {
        targetFieldOwnerType: "phase",
        targetFieldOwnerId: doing.id,
        targetFieldId: field.id,
        value: "auto",
      },
    });

    const entries = await listAuditLog(pipe.id, { category: "config_change" });
    const created = entries.find((e) => e.messageKey === "automationCreated");

    expect(created).toBeDefined();
    expect(created?.resourceType).toBe("automation");
    expect(created?.message).toContain("Sync requester name on move to Doing");
    expect(created?.message).toContain(
      dictionaries.en.automations.builder.triggers.card_entered_phase,
    );
    expect(created?.message).toContain(
      dictionaries.en.automations.builder.actions.update_field,
    );
  });

  it("logs phase and field creation under config_change", async () => {
    const pipe = await createPipe(
      orgId,
      "Structure log",
      dictionaries.en.defaultPhase,
    );
    const phase = await createPhase(pipe.id, "Review");
    await createField("phase", phase.id, {
      label: "Reviewer",
      type: "short_text",
    });

    const entries = await listAuditLog(pipe.id, { category: "config_change" });
    const phaseEntry = entries.find((e) => e.messageKey === "phaseCreated");
    const fieldEntry = entries.find((e) => e.messageKey === "fieldCreated");

    expect(phaseEntry?.resourceType).toBe("phase");
    expect(phaseEntry?.message).toContain("Review");
    expect(fieldEntry?.resourceType).toBe("field");
    expect(fieldEntry?.message).toContain("Reviewer");
    expect(fieldEntry?.message).toContain("Review");
  });

  it("re-renders a stored message in the reader's locale", async () => {
    const { pipe, field } = await pipeWithTitleField("Localised log");
    const [inbox, doing] = await pipePhases(pipe.id);
    const card = await createCard(pipe.id, inbox.id, { [field.id]: "Carla" });
    await moveCardToPhase(card.id, doing.id);

    const [move] = await listAuditLog(pipe.id, { category: "card_activity" });
    expect(move.messageKey).toBe("cardMoved");

    const pt = renderAuditMessage(move, dictionaries.pt);
    expect(pt).toBe(
      `Moveu o card "Carla" de "${inbox.name}" para "${doing.name}"`,
    );
    expect(renderAuditMessage(move, dictionaries.en)).toBe(move.message);

    const created = (await listAuditLog(pipe.id)).find(
      (e) => e.messageKey === "pipeCreated",
    );
    expect(created).toBeDefined();
    if (created) {
      expect(renderAuditMessage(created, dictionaries.pt)).toBe(
        "Criou este pipe",
      );
    }
  });

  it("localises the setting name inside a config-change message", async () => {
    const pipe = await createPipe(
      orgId,
      "Localised setting",
      dictionaries.en.defaultPhase,
    );
    await updatePipeSettings(pipe.id, { visibility: "invite_only" });

    const change = (await listAuditLog(pipe.id)).find(
      (e) => e.messageParams.setting === "visibility",
    );
    expect(change).toBeDefined();
    if (!change) return;

    expect(renderAuditMessage(change, dictionaries.en)).toContain(
      dictionaries.en.generalSettings.visibilityLabel,
    );
    expect(renderAuditMessage(change, dictionaries.pt)).toContain(
      dictionaries.pt.generalSettings.visibilityLabel,
    );
  });

  it("exports the log as CSV with a header row and quote escaping", async () => {
    const pipe = await createPipe(
      orgId,
      'CSV "quoted" pipe',
      dictionaries.en.defaultPhase,
    );
    await createPhase(pipe.id, 'Phase "A"');

    const entries = await listAuditLog(pipe.id);
    const csv = auditLogToCsv(entries, dictionaries.en);
    const lines = csv.trim().split("\n");

    expect(lines[0]).toBe(
      '"Date and time","Performed by","Resource type","Details"',
    );
    expect(lines).toHaveLength(entries.length + 1);
    expect(csv).toContain('Created the phase ""Phase ""A""""');
  });
});
