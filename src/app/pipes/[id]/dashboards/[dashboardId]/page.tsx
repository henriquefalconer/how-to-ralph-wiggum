import { DashboardView } from "@/components/DashboardView";
import { ManageTabs } from "@/components/ManageTabs";
import { TopNav } from "@/components/TopNav";
import { getDashboard, listCharts } from "@/lib/dashboards";
import { getTranslations } from "@/lib/i18n";
import { getPipeWithPhases } from "@/lib/pipes";
import { notFound } from "next/navigation";

export default async function DashboardDetailPage({
  params,
}: { params: Promise<{ id: string; dashboardId: string }> }) {
  const { id, dashboardId } = await params;
  const { locale, dictionary } = await getTranslations();
  const result = await getPipeWithPhases(id);
  const dashboard = await getDashboard(dashboardId);
  if (!result || !dashboard || dashboard.pipeId !== id) {
    notFound();
  }
  const { pipe } = result;

  const charts = await listCharts(dashboardId);

  return (
    <main className="min-h-screen bg-[#F5F6F8]">
      <TopNav locale={locale} dictionary={dictionary} />
      <ManageTabs
        pipeId={pipe.id}
        active="dashboards"
        dictionary={dictionary}
      />
      <DashboardView
        pipeId={pipe.id}
        dashboard={dashboard}
        initialCharts={charts}
        dictionary={dictionary}
      />
    </main>
  );
}
