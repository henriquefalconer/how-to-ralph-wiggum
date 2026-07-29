"use client";

import type { ChartData, Dashboard, DashboardChart } from "@/lib/dashboards";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChartTile } from "./ChartTile";

function timeRangeLabel(range: string, dictionary: Dictionary): string {
  const ranges = dictionary.dashboards.builder.timeRanges as Record<
    string,
    string
  >;
  return ranges[range] ?? ranges.all_time;
}

export function DashboardView({
  pipeId,
  dashboard,
  initialCharts,
  dictionary,
}: {
  pipeId: string;
  dashboard: Dashboard;
  initialCharts: DashboardChart[];
  dictionary: Dictionary;
}) {
  const d = dictionary.dashboards;
  const router = useRouter();
  const [charts, setCharts] = useState(initialCharts);
  const [dataByChart, setDataByChart] = useState<
    Record<string, ChartData | null>
  >({});

  async function loadChart(chartId: string) {
    setDataByChart((prev) => ({ ...prev, [chartId]: prev[chartId] ?? null }));
    try {
      const response = await fetch(`/api/dashboard-charts/${chartId}/render`);
      const body = await response.json();
      if (response.ok) {
        setDataByChart((prev) => ({ ...prev, [chartId]: body.data }));
      }
    } catch {
      // Leave the tile in its loading state — a transient fetch failure
      // shouldn't crash the whole dashboard grid.
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: charts render once on mount / whenever the saved chart list changes — "Reload chart" (per-tile) drives any subsequent re-query, not a loadChart identity change.
  useEffect(() => {
    for (const chart of charts) {
      loadChart(chart.id);
    }
  }, [charts]);

  async function handleDeleteChart(chartId: string) {
    if (!window.confirm(d.deleteChartConfirm)) return;
    const response = await fetch(`/api/dashboard-charts/${chartId}`, {
      method: "DELETE",
    });
    if (response.ok) {
      setCharts((prev) => prev.filter((c) => c.id !== chartId));
    }
  }

  async function handleDeleteDashboard() {
    if (!window.confirm(d.deleteConfirm)) return;
    const response = await fetch(`/api/dashboards/${dashboard.id}`, {
      method: "DELETE",
    });
    if (response.ok) {
      router.push(`/pipes/${pipeId}/dashboards`);
    }
  }

  return (
    <div className="p-6" data-testid="dashboard-view">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          {dashboard.name}
        </h1>
        <div className="flex items-center gap-2">
          <span
            data-testid="dashboard-filter-chip"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600"
          >
            {d.filterChipLabel.replace(
              "{range}",
              timeRangeLabel(dashboard.defaultTimeRange, dictionary),
            )}
          </span>
          <Link
            href={`/pipes/${pipeId}/dashboards/chart?dashboardId=${dashboard.id}`}
            data-testid="add-chart-button"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            + {d.addChartButton}
          </Link>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                data-testid="dashboard-menu-trigger"
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                ⋮
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                className="z-10 min-w-40 rounded-md border border-gray-200 bg-white p-1 shadow-lg"
              >
                <DropdownMenu.Item
                  data-testid="delete-dashboard-item"
                  onSelect={handleDeleteDashboard}
                  className="cursor-pointer rounded px-2 py-1.5 text-sm text-red-600 outline-none hover:bg-red-50"
                >
                  {d.deleteDashboard}
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      {charts.length === 0 ? (
        <div
          data-testid="dashboard-empty-grid"
          className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white py-16"
        >
          <Link
            href={`/pipes/${pipeId}/dashboards/chart?dashboardId=${dashboard.id}`}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            + {d.addChartButton}
          </Link>
        </div>
      ) : (
        <div
          data-testid="chart-grid"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {charts.map((chart) => {
            const data = dataByChart[chart.id];
            return (
              <div
                key={chart.id}
                data-testid="chart-tile"
                data-chart-id={chart.id}
                className="flex h-56 flex-col rounded-lg border border-gray-200 bg-white p-3"
              >
                <div className="mb-1 flex items-start justify-between">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {chart.title}
                  </p>
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button
                        type="button"
                        data-testid="chart-menu-trigger"
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ⋮
                      </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content
                        align="end"
                        className="z-10 min-w-40 rounded-md border border-gray-200 bg-white p-1 shadow-lg"
                      >
                        <DropdownMenu.Item
                          data-testid="reload-chart-item"
                          onSelect={() => loadChart(chart.id)}
                          className="cursor-pointer rounded px-2 py-1.5 text-sm text-gray-700 outline-none hover:bg-gray-50"
                        >
                          {d.chartMenu.reload}
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                          data-testid="edit-chart-item"
                          onSelect={() =>
                            router.push(
                              `/pipes/${pipeId}/dashboards/chart?dashboardId=${dashboard.id}&chartId=${chart.id}`,
                            )
                          }
                          className="cursor-pointer rounded px-2 py-1.5 text-sm text-gray-700 outline-none hover:bg-gray-50"
                        >
                          {d.chartMenu.edit}
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                          data-testid="delete-chart-item"
                          onSelect={() => handleDeleteChart(chart.id)}
                          className="cursor-pointer rounded px-2 py-1.5 text-sm text-red-600 outline-none hover:bg-red-50"
                        >
                          {d.chartMenu.delete}
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </div>
                <div className="min-h-0 flex-1">
                  {data ? (
                    <ChartTile
                      vizType={chart.vizType}
                      data={data}
                      dictionary={dictionary}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-gray-400">
                      …
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Link
        href={`/pipes/${pipeId}/dashboards`}
        className="mt-6 inline-block text-sm text-blue-600 hover:underline"
      >
        ← {d.backToList}
      </Link>
    </div>
  );
}
