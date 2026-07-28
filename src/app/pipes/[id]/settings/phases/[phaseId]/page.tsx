import { PhaseEditor } from "@/components/PhaseEditor";
import { TopNav } from "@/components/TopNav";
import { getTranslations } from "@/lib/i18n";
import { getPipeWithPhases } from "@/lib/pipes";
import { notFound } from "next/navigation";

export default async function PhaseSettingsPage({
  params,
}: { params: Promise<{ id: string; phaseId: string }> }) {
  const { id, phaseId } = await params;
  const { locale, dictionary } = await getTranslations();
  const result = await getPipeWithPhases(id);

  if (!result) {
    notFound();
  }

  const { pipe, phases } = result;
  const currentPhase = phases.find((phase) => phase.id === phaseId);

  if (!currentPhase) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#F5F6F8]">
      <TopNav locale={locale} dictionary={dictionary} />
      <PhaseEditor
        pipe={pipe}
        phases={phases}
        currentPhaseId={currentPhase.id}
        dictionary={dictionary}
      />
    </main>
  );
}
