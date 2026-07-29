import { ChartBuilder } from "@/components/ChartBuilder";
import { ManageTabs } from "@/components/ManageTabs";
import { TopNav } from "@/components/TopNav";
import { getChart, listDashboards } from "@/lib/dashboards";
import { listFields } from "@/lib/fields";
import { getTranslations } from "@/lib/i18n/server";
import { getPipeWithPhases } from "@/lib/pipes";
import { notFound } from "next/navigation";

export default async function ChartBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ dashboardId?: string; chartId?: string }>;
}) {
  const { id } = await params;
  const { dashboardId, chartId } = await searchParams;
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

  const dashboards = await listDashboards(pipe.id);
  const chart = chartId ? await getChart(chartId) : undefined;
  if (chartId && !chart) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#F5F6F8]">
      <TopNav locale={locale} dictionary={dictionary} />
      <ManageTabs
        pipeId={pipe.id}
        active="dashboards"
        dictionary={dictionary}
      />
      <ChartBuilder
        pipeId={pipe.id}
        phases={phases}
        startFormFields={startFormFields}
        phaseFieldsByPhase={phaseFieldsByPhase}
        dashboards={dashboards}
        dictionary={dictionary}
        chart={chart ?? undefined}
        initialDashboardId={dashboardId}
      />
    </main>
  );
}
