import { AutomationBuilder } from "@/components/AutomationBuilder";
import { ManageTabs } from "@/components/ManageTabs";
import { TopNav } from "@/components/TopNav";
import { getAutomation } from "@/lib/automations";
import { listFields } from "@/lib/fields";
import { getTranslations } from "@/lib/i18n/server";
import { getPipeWithPhases } from "@/lib/pipes";
import { notFound } from "next/navigation";

export default async function EditAutomationPage({
  params,
}: { params: Promise<{ id: string; automationId: string }> }) {
  const { id, automationId } = await params;
  const { locale, dictionary } = await getTranslations();
  const [result, automation] = await Promise.all([
    getPipeWithPhases(id),
    getAutomation(automationId),
  ]);
  if (!result || !automation || automation.pipeId !== id) {
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
      <ManageTabs
        pipeId={pipe.id}
        active="automations"
        dictionary={dictionary}
      />
      <AutomationBuilder
        pipeId={pipe.id}
        phases={phases}
        startFormFields={startFormFields}
        phaseFieldsByPhase={phaseFieldsByPhase}
        dictionary={dictionary}
        automation={automation}
      />
    </main>
  );
}
