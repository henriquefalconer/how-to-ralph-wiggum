"use client";

import type { Dictionary } from "@/lib/i18n";
import type { ReportWithCount } from "@/lib/reports";
import Link from "next/link";
import { useMemo, useState } from "react";

export function ReportsList({
  pipeId,
  reports,
  dictionary,
}: {
  pipeId: string;
  reports: ReportWithCount[];
  dictionary: Dictionary;
}) {
  const d = dictionary.reports;
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = q
      ? reports.filter((r) => r.name.toLowerCase().includes(q))
      : reports;
    return [...rows].sort((a, b) => a.name.localeCompare(b.name));
  }, [reports, search]);

  function resultsLabel(count: number): string {
    return count === 1
      ? d.resultsCountOne.replace("{n}", "1")
      : d.resultsCountOther.replace("{n}", String(count));
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">{d.heading}</h1>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <input
          data-testid="reports-search"
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={d.searchPlaceholder}
          className="w-64 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
        <span
          data-testid="reports-sort-label"
          className="text-sm text-gray-500"
        >
          {d.sortByLabel}
        </span>
      </div>

      {reports.length === 0 ? (
        <div
          data-testid="reports-empty-state"
          className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white py-16"
        >
          <div className="mb-3 text-4xl">📊</div>
          <p className="mb-4 text-sm text-gray-600">{d.emptyStateTitle}</p>
          <Link
            href={`/pipes/${pipeId}/reports_v2/new`}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            {d.emptyStateCta}
          </Link>
        </div>
      ) : (
        <div
          data-testid="reports-grid"
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
        >
          {visible.map((report) => (
            <Link
              key={report.id}
              href={`/pipes/${pipeId}/reports_v2/${report.id}`}
              data-testid="report-tile"
              data-report-id={report.id}
              className="rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm"
            >
              <p className="text-sm font-medium text-gray-900">{report.name}</p>
              <span
                data-testid="report-result-count"
                className="mt-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
              >
                {resultsLabel(report.resultCount)}
              </span>
            </Link>
          ))}

          <Link
            href={`/pipes/${pipeId}/reports_v2/new`}
            data-testid="new-report-tile"
            className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-4 text-sm font-medium text-blue-600 hover:border-blue-400 hover:bg-blue-50"
          >
            + {d.newReportTile}
          </Link>
        </div>
      )}

      <Link
        href={`/pipes/${pipeId}`}
        className="mt-6 inline-block text-sm text-blue-600 hover:underline"
      >
        ← {d.backToBoard}
      </Link>
    </div>
  );
}
