import { AuditLogModal } from "@/components/AuditLogModal";
import { ManageTabs } from "@/components/ManageTabs";
import { TopNav } from "@/components/TopNav";
import { listAuditLog, toAuditLogEntryView } from "@/lib/audit-log";
import { getTranslations } from "@/lib/i18n";
import { getPipe } from "@/lib/pipes";
import { notFound } from "next/navigation";

export default async function PipeActivitiesPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { locale, dictionary } = await getTranslations();
  const pipe = await getPipe(id);
  if (!pipe) {
    notFound();
  }

  // Recomputed on every open — the log is a live query over what actually
  // happened, never a cached snapshot.
  const entries = await listAuditLog(pipe.id);

  return (
    <main className="min-h-screen bg-[#F5F6F8]">
      <TopNav locale={locale} dictionary={dictionary} />
      <ManageTabs
        pipeId={pipe.id}
        active="activities"
        dictionary={dictionary}
      />
      <AuditLogModal
        pipeId={pipe.id}
        entries={entries.map(toAuditLogEntryView)}
        dictionary={dictionary}
        locale={locale}
      />
    </main>
  );
}
