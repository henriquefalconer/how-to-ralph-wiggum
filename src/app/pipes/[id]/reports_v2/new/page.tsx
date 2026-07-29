import { ManageTabs } from "@/components/ManageTabs";
import { ReportBuilder } from "@/components/ReportBuilder";
import { TopNav } from "@/components/TopNav";
import { listFields } from "@/lib/fields";
import { getTranslations } from "@/lib/i18n/server";
import { getPipeWithPhases } from "@/lib/pipes";
import { notFound } from "next/navigation";

export default async function NewReportPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { locale, dictionary } = await getTranslations();
  const result = await getPipeWithPhases(id);
  if (!result) {
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
      />
    </main>
  );
}
