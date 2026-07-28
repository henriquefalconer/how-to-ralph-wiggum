import { AutomationsList } from "@/components/AutomationsList";
import { ManageTabs } from "@/components/ManageTabs";
import { TopNav } from "@/components/TopNav";
import { listAutomations } from "@/lib/automations";
import { getTranslations } from "@/lib/i18n";
import { getPipeWithPhases } from "@/lib/pipes";
import { notFound } from "next/navigation";

export default async function AutomationsPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { locale, dictionary } = await getTranslations();
  const result = await getPipeWithPhases(id);
  if (!result) {
    notFound();
  }
  const { pipe } = result;

  const automations = await listAutomations(pipe.id);

  return (
    <main className="min-h-screen bg-[#F5F6F8]">
      <TopNav locale={locale} dictionary={dictionary} />
      <ManageTabs
        pipeId={pipe.id}
        active="automations"
        dictionary={dictionary}
      />
      <AutomationsList
        pipeId={pipe.id}
        automations={automations}
        dictionary={dictionary}
      />
    </main>
  );
}
