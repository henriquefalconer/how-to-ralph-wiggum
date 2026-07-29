import { AUDITED_PIPE_SETTINGS, logAuditEntry } from "@/lib/audit-log";
import { db } from "@/lib/db";
import {
  cards,
  fields,
  organizations,
  phases,
  type pipeDefaultViews,
  type pipeExpirationAlertUnits,
  type pipeVisibilities,
  pipes,
} from "@/lib/db/schema";
import { listFields } from "@/lib/fields";
import { type Dictionary, getDictionary } from "@/lib/i18n";
import { defaultLocale } from "@/lib/i18n/locales";
import { and, asc, count, eq } from "drizzle-orm";

const PIPE_COLOR_PALETTE = [
  "#1AB6A6",
  "#3DBE5B",
  "#F2994A",
  "#EB5757",
  "#9B51E0",
  "#2E68D9",
  "#F2C94C",
  "#56CCF2",
];

export const PIPE_ICONS = [
  "Layout",
  "Briefcase",
  "ClipboardList",
  "ShoppingCart",
  "Users",
  "FileText",
  "Star",
  "Target",
];

export interface PipeSummary {
  id: string;
  name: string;
  color: string;
  cardsCount: number;
  itemName: string | null;
}

export type Pipe = typeof pipes.$inferSelect;
export type PipeDefaultView = (typeof pipeDefaultViews)[number];
export type PipeExpirationAlertUnit = (typeof pipeExpirationAlertUnits)[number];
export type PipeVisibility = (typeof pipeVisibilities)[number];

export async function getDefaultOrgId(): Promise<string> {
  const [existing] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .limit(1);
  if (existing) return existing.id;

  const [created] = await db
    .insert(organizations)
    .values({ name: "Default Organization" })
    .returning({ id: organizations.id });
  return created.id;
}

export async function listPipes(orgId: string): Promise<PipeSummary[]> {
  const rows = await db
    .select()
    .from(pipes)
    .where(eq(pipes.orgId, orgId))
    .orderBy(asc(pipes.createdAt));

  const counts = await Promise.all(
    rows.map(async (p) => {
      const [{ value }] = await db
        .select({ value: count() })
        .from(cards)
        .where(eq(cards.pipeId, p.id));
      return value;
    }),
  );

  return rows.map((p, index) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    cardsCount: counts[index],
    itemName: p.itemName,
  }));
}

export async function createPipe(
  orgId: string,
  name: string,
  defaultPhaseNames: Dictionary["defaultPhase"],
) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Pipe name is required");
  }

  const [{ value: existingCount }] = await db
    .select({ value: count() })
    .from(pipes)
    .where(eq(pipes.orgId, orgId));
  const color = PIPE_COLOR_PALETTE[existingCount % PIPE_COLOR_PALETTE.length];

  const [pipe] = await db
    .insert(pipes)
    .values({ orgId, name: trimmed, color })
    .returning();

  await db.insert(phases).values([
    {
      pipeId: pipe.id,
      name: defaultPhaseNames.inbox,
      done: false,
      position: 0,
      allowCardCreation: true,
    },
    {
      pipeId: pipe.id,
      name: defaultPhaseNames.doing,
      done: false,
      position: 1,
    },
    { pipeId: pipe.id, name: defaultPhaseNames.done, done: true, position: 2 },
  ]);

  await logAuditEntry({
    pipeId: pipe.id,
    category: "config_change",
    resourceType: "pipe",
    messageKey: "pipeCreated",
  });

  return pipe;
}

export async function getPipeWithPhases(pipeId: string) {
  const [pipe] = await db.select().from(pipes).where(eq(pipes.id, pipeId));
  if (!pipe) return null;

  const pipePhases = await db
    .select()
    .from(phases)
    .where(eq(phases.pipeId, pipeId))
    .orderBy(asc(phases.position));

  return { pipe, phases: pipePhases };
}

export async function getPipe(pipeId: string): Promise<Pipe | null> {
  const [pipe] = await db.select().from(pipes).where(eq(pipes.id, pipeId));
  return pipe ?? null;
}

export interface PipeSettingsInput {
  name?: string;
  icon?: string | null;
  tags?: string[];
  itemName?: string | null;
  createCardButtonLabel?: string | null;
  defaultView?: PipeDefaultView;
  titleFieldId?: string | null;
  kanbanPreviewFieldIds?: string[];
  connectedCardFieldIds?: string[];
  expirationAlertTime?: number;
  expirationAlertUnit?: PipeExpirationAlertUnit;
  expirationAlertBusinessDaysOnly?: boolean;
  visibility?: PipeVisibility;
  aiAgentsEnabled?: boolean;
  aiCopilotEnabled?: boolean;
  allowBulkActions?: boolean;
  restrictEditToAssignee?: boolean;
  restrictDeleteToAdmin?: boolean;
}

const MAX_PIPE_TAGS = 3;

export async function updatePipeSettings(
  pipeId: string,
  input: PipeSettingsInput,
): Promise<Pipe> {
  const existing = await getPipe(pipeId);
  if (!existing) {
    throw new Error("Pipe not found");
  }
  if (input.name !== undefined && !input.name.trim()) {
    throw new Error("Pipe name is required");
  }
  if (input.tags !== undefined && input.tags.length > MAX_PIPE_TAGS) {
    throw new Error(`A pipe may have at most ${MAX_PIPE_TAGS} tags`);
  }
  if (
    input.expirationAlertTime !== undefined &&
    input.expirationAlertTime < 0
  ) {
    throw new Error("Expiration alert time cannot be negative");
  }

  const [updated] = await db
    .update(pipes)
    .set({
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      ...(input.itemName !== undefined
        ? { itemName: input.itemName?.trim() || null }
        : {}),
      ...(input.createCardButtonLabel !== undefined
        ? { createCardButtonLabel: input.createCardButtonLabel?.trim() || null }
        : {}),
      ...(input.defaultView !== undefined
        ? { defaultView: input.defaultView }
        : {}),
      ...(input.titleFieldId !== undefined
        ? { titleFieldId: input.titleFieldId }
        : {}),
      ...(input.kanbanPreviewFieldIds !== undefined
        ? { kanbanPreviewFieldIds: input.kanbanPreviewFieldIds }
        : {}),
      ...(input.connectedCardFieldIds !== undefined
        ? { connectedCardFieldIds: input.connectedCardFieldIds }
        : {}),
      ...(input.expirationAlertTime !== undefined
        ? { expirationAlertTime: input.expirationAlertTime }
        : {}),
      ...(input.expirationAlertUnit !== undefined
        ? { expirationAlertUnit: input.expirationAlertUnit }
        : {}),
      ...(input.expirationAlertBusinessDaysOnly !== undefined
        ? {
            expirationAlertBusinessDaysOnly:
              input.expirationAlertBusinessDaysOnly,
          }
        : {}),
      ...(input.visibility !== undefined
        ? { visibility: input.visibility }
        : {}),
      ...(input.aiAgentsEnabled !== undefined
        ? { aiAgentsEnabled: input.aiAgentsEnabled }
        : {}),
      ...(input.aiCopilotEnabled !== undefined
        ? { aiCopilotEnabled: input.aiCopilotEnabled }
        : {}),
      ...(input.allowBulkActions !== undefined
        ? { allowBulkActions: input.allowBulkActions }
        : {}),
      ...(input.restrictEditToAssignee !== undefined
        ? { restrictEditToAssignee: input.restrictEditToAssignee }
        : {}),
      ...(input.restrictDeleteToAdmin !== undefined
        ? { restrictDeleteToAdmin: input.restrictDeleteToAdmin }
        : {}),
    })
    .where(eq(pipes.id, pipeId))
    .returning();

  await logPipeSettingChanges(existing, updated);

  return updated;
}

// One audit entry per setting that actually changed, each carrying the old and
// new value so the log can render "…from X to Y" in the reader's locale.
async function logPipeSettingChanges(before: Pipe, after: Pipe): Promise<void> {
  const changed = (Object.keys(AUDITED_PIPE_SETTINGS) as (keyof Pipe)[]).filter(
    (key) => formatSettingValue(before[key]) !== formatSettingValue(after[key]),
  );
  if (changed.length === 0) return;

  const emptyValue = getDictionary(defaultLocale).auditLog.emptyValue;

  // Both lookups below only matter for specific settings, so they stay off the
  // hot path of an ordinary toggle change.
  const labelById = changed.includes("titleFieldId")
    ? new Map(
        (await listFields("start_form", after.id)).map((f) => [f.id, f.label]),
      )
    : new Map<string, string>();
  const asLabel = (value: string) =>
    value ? (labelById.get(value) ?? value) : emptyValue;

  const [org] = changed.includes("visibility")
    ? await db
        .select({ name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, after.orgId))
    : [];

  for (const key of changed) {
    const fieldValued = key === "titleFieldId";
    const from = formatSettingValue(before[key]);
    const to = formatSettingValue(after[key]);

    await logAuditEntry({
      pipeId: after.id,
      category: "config_change",
      resourceType: "pipe",
      messageKey: "pipeSettingUpdated",
      params: {
        setting: key,
        from: fieldValued ? asLabel(from) : from || emptyValue,
        to: fieldValued ? asLabel(to) : to || emptyValue,
        org: org?.name ?? "",
      },
    });
  }
}

function formatSettingValue(value: Pipe[keyof Pipe]): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

// A custom item_name substitutes for the localized "Cards" noun everywhere it
// would otherwise appear in this pipe's UI copy (create-button default text,
// counts). Unset (null) falls back to the dictionary's localized default.
export function resolveItemName(
  pipe: Pick<Pipe, "itemName">,
  dictionary: Dictionary,
): string {
  return (
    pipe.itemName?.trim() || dictionary.home.cardsCountOther.replace("{n} ", "")
  );
}

export function resolveCreateCardButtonLabel(
  pipe: Pick<Pipe, "createCardButtonLabel" | "itemName">,
  dictionary: Dictionary,
): string {
  if (pipe.createCardButtonLabel?.trim()) {
    return pipe.createCardButtonLabel.trim();
  }
  if (pipe.itemName?.trim()) {
    return dictionary.kanban.createCardTemplate.replace(
      "{item}",
      pipe.itemName.trim(),
    );
  }
  return dictionary.kanban.createCard;
}

export async function deletePipe(pipeId: string): Promise<void> {
  const existing = await getPipe(pipeId);
  if (!existing) {
    throw new Error("Pipe not found");
  }

  // `fields` is a polymorphic table (no DB-level FK into pipes/phases/tables),
  // so start_form- and phase-owned fields must be cleaned up explicitly before
  // the cascade below removes the phases they point at.
  const pipePhases = await db
    .select({ id: phases.id })
    .from(phases)
    .where(eq(phases.pipeId, pipeId));

  await db
    .delete(fields)
    .where(and(eq(fields.ownerType, "start_form"), eq(fields.ownerId, pipeId)));
  for (const phase of pipePhases) {
    await db
      .delete(fields)
      .where(and(eq(fields.ownerType, "phase"), eq(fields.ownerId, phase.id)));
  }

  await db.delete(pipes).where(eq(pipes.id, pipeId));
}
