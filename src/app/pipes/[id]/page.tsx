import { TopNav } from "@/components/TopNav";
import { getTranslations } from "@/lib/i18n";
import { getPipeWithPhases } from "@/lib/pipes";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function PipePage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { locale, dictionary } = await getTranslations();
  const result = await getPipeWithPhases(id);

  if (!result) {
    notFound();
  }

  const { pipe, phases } = result;

  return (
    <main className="min-h-screen bg-[#F5F6F8]">
      <TopNav locale={locale} dictionary={dictionary} />
      <div className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-md text-white"
            style={{ backgroundColor: pipe.color }}
          >
            ▦
          </span>
          <h1 className="text-lg font-semibold text-gray-900">{pipe.name}</h1>
        </div>
      </div>
      <div
        data-testid="kanban-board"
        className="flex gap-4 overflow-x-auto p-6"
      >
        {phases.map((phase) => (
          <div
            key={phase.id}
            data-testid="phase-column"
            className="w-72 shrink-0 rounded-lg bg-[#EEF0F3] p-3"
          >
            <div className="mb-3 flex items-center gap-2 px-1">
              <span className="text-sm font-semibold text-gray-800">
                {phase.name}
              </span>
              <span
                data-testid="phase-card-count"
                className="rounded bg-white px-1.5 py-0.5 text-xs text-gray-500"
              >
                0
              </span>
            </div>
            {/* Card list is populated once the Card entity (feature-004) lands */}
            <div className="flex h-40 items-center justify-center rounded-md bg-white/60 text-center text-xs text-gray-400" />
          </div>
        ))}
        <button
          type="button"
          className="h-fit w-56 shrink-0 rounded-lg border border-dashed border-gray-300 bg-white/60 px-4 py-2 text-sm text-gray-500 hover:border-gray-400"
        >
          + {dictionary.kanban.newPhase}
        </button>
      </div>
      <div className="px-6 pb-6">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← {dictionary.kanban.backToHome}
        </Link>
      </div>
    </main>
  );
}
