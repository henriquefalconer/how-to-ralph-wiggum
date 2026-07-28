import { ManageTabs } from "@/components/ManageTabs";
import { ReportsList } from "@/components/ReportsList";
import { TopNav } from "@/components/TopNav";
import { getTranslations } from "@/lib/i18n";
import { getPipeWithPhases } from "@/lib/pipes";
import { listReportsWithCounts } from "@/lib/reports";
import { notFound } from "next/navigation";

export default async function ReportsPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { locale, dictionary } = await getTranslations();
  const result = await getPipeWithPhases(id);
  if (!result) {
    notFound();
  }
  const { pipe } = result;

  const reports = await listReportsWithCounts(pipe.id);

  return (
    <main className="min-h-screen bg-[#F5F6F8]">
      <TopNav locale={locale} dictionary={dictionary} />
      <ManageTabs pipeId={pipe.id} active="reports" dictionary={dictionary} />
      <ReportsList pipeId={pipe.id} reports={reports} dictionary={dictionary} />
    </main>
  );
}
