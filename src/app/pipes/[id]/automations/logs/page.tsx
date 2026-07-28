import { ManageTabs } from "@/components/ManageTabs";
import { TopNav } from "@/components/TopNav";
import { listAutomationRuns } from "@/lib/automations";
import { getTranslations } from "@/lib/i18n";
import { getPipeWithPhases } from "@/lib/pipes";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function AutomationLogsPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { locale, dictionary } = await getTranslations();
  const result = await getPipeWithPhases(id);
  if (!result) {
    notFound();
  }
  const { pipe } = result;
  const l = dictionary.automations.logs;

  const runs = await listAutomationRuns(pipe.id);

  return (
    <main className="min-h-screen bg-[#F5F6F8]">
      <TopNav locale={locale} dictionary={dictionary} />
      <ManageTabs
        pipeId={pipe.id}
        active="automations"
        dictionary={dictionary}
      />
      <div className="p-6">
        <h1 className="mb-4 text-xl font-semibold text-gray-900">
          {l.heading}
        </h1>

        {runs.length === 0 ? (
          <p
            data-testid="automation-logs-empty"
            className="text-sm text-gray-500"
          >
            {l.emptyState}
          </p>
        ) : (
          <table
            className="w-full text-left text-sm"
            data-testid="automation-logs-table"
          >
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                <th className="py-2">{l.columnAutomation}</th>
                <th className="py-2">{l.columnCard}</th>
                <th className="py-2">{l.columnStatus}</th>
                <th className="py-2">{l.columnStartedAt}</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr
                  key={run.id}
                  data-testid="automation-log-row"
                  className="border-b border-gray-100"
                >
                  <td className="py-2">{run.automationName}</td>
                  <td className="py-2">{run.cardTitle}</td>
                  <td className="py-2">
                    <span
                      data-testid="automation-log-status"
                      className={
                        run.status === "success"
                          ? "rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800"
                          : "rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800"
                      }
                    >
                      {run.status === "success"
                        ? l.statusSuccess
                        : l.statusError}
                    </span>
                    <p className="mt-1 text-xs text-gray-400">{run.message}</p>
                  </td>
                  <td className="py-2 text-gray-500">
                    {new Date(run.startedAt).toLocaleString(locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <Link
          href={`/pipes/${pipe.id}/automations`}
          className="mt-6 inline-block text-sm text-blue-600 hover:underline"
        >
          ← {l.backToList}
        </Link>
      </div>
    </main>
  );
}
