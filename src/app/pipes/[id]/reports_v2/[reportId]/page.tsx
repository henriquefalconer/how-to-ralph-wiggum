import { ManageTabs } from "@/components/ManageTabs";
import { ReportBuilder } from "@/components/ReportBuilder";
import { TopNav } from "@/components/TopNav";
import { listFields } from "@/lib/fields";
import { getTranslations } from "@/lib/i18n/server";
import { getPipeWithPhases } from "@/lib/pipes";
import { getReport, getReportResults } from "@/lib/reports";
import { notFound } from "next/navigation";

export default async function SavedReportPage({
  params,
}: { params: Promise<{ id: string; reportId: string }> }) {
  const { id, reportId } = await params;
  const { locale, dictionary } = await getTranslations();
  const result = await getPipeWithPhases(id);
  const report = await getReport(reportId);
  if (!result || !report || report.pipeId !== id) {
    notFound();
  }
  const { pipe, phases } = result;

  const startFormFields = await listFields("start_form", pipe.id);
  const phaseFieldsEntries = await Promise.all(
    phases.map(
      async (phase) => [phase.id, await listFields("phase", phase.id)] as const,
    ),
  );
  const phaseFieldsByPhase = Object.fromEntries(phaseFieldsEntries);
  const initialResults = await getReportResults(reportId);

  return (
    <main className="min-h-screen bg-[#F5F6F8]">
      <TopNav locale={locale} dictionary={dictionary} />
      <ManageTabs pipeId={pipe.id} active="reports" dictionary={dictionary} />
      <ReportBuilder
        pipeId={pipe.id}
        phases={phases}
        startFormFields={startFormFields}
        phaseFieldsByPhase={phaseFieldsByPhase}
        dictionary={dictionary}
        report={report}
        initialResults={initialResults}
      />
    </main>
  );
}
