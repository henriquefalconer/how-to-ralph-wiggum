import {
  type AuditLogCategory,
  auditLogToCsv,
  listAuditLog,
  renderAuditMessage,
} from "@/lib/audit-log";
import { getDictionary, getLocale, isLocale } from "@/lib/i18n";
import { getPipe } from "@/lib/pipes";
import { NextResponse } from "next/server";

function isCategory(value: string): value is AuditLogCategory {
  return value === "card_activity" || value === "config_change";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const pipe = await getPipe(id);
  if (!pipe) {
    return NextResponse.json({ error: "Pipe not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const category = url.searchParams.get("category") ?? "";
  const author = url.searchParams.get("author") ?? undefined;
  const format = url.searchParams.get("format") ?? "json";
  const requestedLocale = url.searchParams.get("locale") ?? "";

  const locale = isLocale(requestedLocale)
    ? requestedLocale
    : await getLocale();
  const dictionary = getDictionary(locale);

  const entries = await listAuditLog(id, {
    category: isCategory(category) ? category : undefined,
    author,
  });

  if (format === "csv") {
    const filename = `audit-log-${id}.csv`;
    return new Response(auditLogToCsv(entries, dictionary), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  return NextResponse.json({
    entries: entries.map((entry) => ({
      id: entry.id,
      pipeId: entry.pipeId,
      category: entry.category,
      resourceType: entry.resourceType,
      actor: { name: entry.actorName, email: entry.actorEmail },
      message: renderAuditMessage(entry, dictionary),
      messageKey: entry.messageKey,
      messageParams: entry.messageParams,
      occurredAt: entry.occurredAt.toISOString(),
    })),
  });
}
