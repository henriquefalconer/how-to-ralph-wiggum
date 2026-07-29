import { DashboardsList } from "@/components/DashboardsList";
import { ManageTabs } from "@/components/ManageTabs";
import { TopNav } from "@/components/TopNav";
import { listDashboardsWithChartCounts } from "@/lib/dashboards";
import { getTranslations } from "@/lib/i18n";
import { getPipeWithPhases } from "@/lib/pipes";
import { notFound } from "next/navigation";

export default async function DashboardsPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { locale, dictionary } = await getTranslations();
  const result = await getPipeWithPhases(id);
  if (!result) {
    notFound();
  }
  const { pipe } = result;

  const dashboards = await listDashboardsWithChartCounts(pipe.id);

  return (
    <main className="min-h-screen bg-[#F5F6F8]">
      <TopNav locale={locale} dictionary={dictionary} />
      <ManageTabs
        pipeId={pipe.id}
        active="dashboards"
        dictionary={dictionary}
      />
      <DashboardsList
        pipeId={pipe.id}
        dashboards={dashboards}
        dictionary={dictionary}
      />
    </main>
  );
}
