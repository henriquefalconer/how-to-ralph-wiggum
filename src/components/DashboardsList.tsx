"use client";

import type { DashboardWithChartCount } from "@/lib/dashboards";
import type { Dictionary } from "@/lib/i18n";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreateDashboardModal } from "./CreateDashboardModal";

export function DashboardsList({
  pipeId,
  dashboards,
  dictionary,
}: {
  pipeId: string;
  dashboards: DashboardWithChartCount[];
  dictionary: Dictionary;
}) {
  const d = dictionary.dashboards;
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">{d.heading}</h1>
      </div>

      {dashboards.length === 0 ? (
        <div
          data-testid="dashboards-empty-state"
          className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white py-16"
        >
          <div className="mb-3 text-4xl">📈</div>
          <p className="mb-4 text-sm text-gray-600">{d.emptyStateTitle}</p>
          <button
            type="button"
            data-testid="create-dashboard-cta"
            onClick={() => setModalOpen(true)}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            {d.emptyStateCta}
          </button>
        </div>
      ) : (
        <div
          data-testid="dashboards-grid"
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
        >
          {dashboards.map((dashboard) => (
            <Link
              key={dashboard.id}
              href={`/pipes/${pipeId}/dashboards/${dashboard.id}`}
              data-testid="dashboard-tile"
              data-dashboard-id={dashboard.id}
              className="rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm"
            >
              <p className="text-sm font-medium text-gray-900">
                {dashboard.name}
              </p>
              <span
                data-testid="dashboard-chart-count"
                className="mt-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
              >
                {dashboard.chartCount}
              </span>
            </Link>
          ))}

          <button
            type="button"
            data-testid="new-dashboard-tile"
            onClick={() => setModalOpen(true)}
            className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-4 text-sm font-medium text-blue-600 hover:border-blue-400 hover:bg-blue-50"
          >
            + {d.emptyStateCta}
          </button>
        </div>
      )}

      <Link
        href={`/pipes/${pipeId}`}
        className="mt-6 inline-block text-sm text-blue-600 hover:underline"
      >
        ← {d.backToBoard}
      </Link>

      {modalOpen && (
        <CreateDashboardModal
          pipeId={pipeId}
          dictionary={dictionary}
          onClose={() => setModalOpen(false)}
          onCreated={(id) => {
            setModalOpen(false);
            router.push(`/pipes/${pipeId}/dashboards/${id}`);
          }}
        />
      )}
    </div>
  );
}
