import {
  type AuditLogCategory,
  type AuditLogEntryView,
  type AuditLogResourceType,
  type AuditMessageKey,
  renderAuditMessage,
} from "@/lib/audit-message";
import { db } from "@/lib/db";
import { auditLogEntries, pipes } from "@/lib/db/schema";
import type { Dictionary } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/server";
import { defaultLocale } from "@/lib/i18n/locales";
import { getOrCreateSelfUser } from "@/lib/pipe-members";
import { and, desc, eq } from "drizzle-orm";

export type AuditLogEntry = typeof auditLogEntries.$inferSelect;

export {
  AUDITED_PIPE_SETTINGS,
  renderAuditMessage,
  type AuditLogCategory,
  type AuditLogEntryView,
  type AuditLogResourceType,
  type AuditMessageKey,
} from "@/lib/audit-message";

// The dashboard renders entries in the reader's locale, so it receives the
// message key and params rather than the stored canonical sentence.
export function toAuditLogEntryView(entry: AuditLogEntry): AuditLogEntryView {
  return {
    id: entry.id,
    category: entry.category,
    resourceType: entry.resourceType,
    actorName: entry.actorName,
    actorEmail: entry.actorEmail,
    messageKey: entry.messageKey,
    messageParams: entry.messageParams,
    occurredAt: entry.occurredAt.toISOString(),
  };
}

export interface LogAuditEntryInput {
  pipeId: string;
  category: AuditLogCategory;
  resourceType: AuditLogResourceType;
  messageKey: AuditMessageKey;
  params?: Record<string, string>;
  actorUserId?: string;
}

// A pipe never changes org, and an org has exactly one implicit self user, so
// both lookups are cached in-process: logging sits on every mutation path and
// must not cost three round trips per write.
const actorByPipe = new Map<
  string,
  { id: string; name: string; email: string }
>();

async function resolveActor(pipeId: string) {
  const cached = actorByPipe.get(pipeId);
  if (cached) return cached;

  const [pipe] = await db
    .select({ orgId: pipes.orgId })
    .from(pipes)
    .where(eq(pipes.id, pipeId));
  if (!pipe) return null;

  const self = await getOrCreateSelfUser(pipe.orgId);
  const actor = { id: self.id, name: self.name, email: self.email };
  actorByPipe.set(pipeId, actor);
  return actor;
}

export async function logAuditEntry(
  input: LogAuditEntryInput,
): Promise<AuditLogEntry | null> {
  try {
    const actor = await resolveActor(input.pipeId);
    if (!actor) return null;
    const params = input.params ?? {};
    const message = renderAuditMessage(
      { messageKey: input.messageKey, messageParams: params },
      getDictionary(defaultLocale),
    );

    const [entry] = await db
      .insert(auditLogEntries)
      .values({
        pipeId: input.pipeId,
        actorUserId: input.actorUserId ?? actor.id,
        actorName: actor.name,
        actorEmail: actor.email,
        category: input.category,
        resourceType: input.resourceType,
        message,
        messageKey: input.messageKey,
        messageParams: params,
      })
      .returning();

    return entry;
  } catch (error) {
    // The audit log must never take a product action down with it.
    console.error("Failed to write audit log entry", error);
    return null;
  }
}

export interface ListAuditLogOptions {
  category?: AuditLogCategory;
  author?: string;
  limit?: number;
}

export async function listAuditLog(
  pipeId: string,
  options: ListAuditLogOptions = {},
): Promise<AuditLogEntry[]> {
  const where = options.category
    ? and(
        eq(auditLogEntries.pipeId, pipeId),
        eq(auditLogEntries.category, options.category),
      )
    : eq(auditLogEntries.pipeId, pipeId);

  const query = db
    .select()
    .from(auditLogEntries)
    .where(where)
    .orderBy(desc(auditLogEntries.occurredAt), desc(auditLogEntries.id));

  const rows = options.limit ? await query.limit(options.limit) : await query;

  const author = options.author?.trim().toLowerCase();
  if (!author) return rows;

  return rows.filter(
    (row) =>
      row.actorName.toLowerCase().includes(author) ||
      row.actorEmail.toLowerCase().includes(author),
  );
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function auditLogToCsv(
  entries: AuditLogEntry[],
  dictionary: Dictionary,
): string {
  const d = dictionary.auditLog;
  const header = [
    d.columnDateTime,
    d.columnActor,
    d.columnResourceType,
    d.columnDetails,
  ]
    .map(csvCell)
    .join(",");

  const rows = entries.map((entry) =>
    [
      entry.occurredAt.toISOString(),
      `${entry.actorName} <${entry.actorEmail}>`,
      d.resourceTypes[entry.resourceType],
      renderAuditMessage(entry, dictionary),
    ]
      .map(csvCell)
      .join(","),
  );

  return [header, ...rows].join("\n");
}
