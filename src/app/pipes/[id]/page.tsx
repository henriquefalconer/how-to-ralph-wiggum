import { KanbanBoard } from "@/components/KanbanBoard";
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
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-md text-white"
            style={{ backgroundColor: pipe.color }}
          >
            ▦
          </span>
          <h1 className="text-lg font-semibold text-gray-900">{pipe.name}</h1>
        </div>
        <Link
          href={`/pipes/${pipe.id}/settings/phases`}
          data-testid="manage-pipe-link"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {dictionary.kanban.manage}
        </Link>
      </div>
      <KanbanBoard
        pipeId={pipe.id}
        initialPhases={phases}
        dictionary={dictionary}
      />
      <div className="px-6 pb-6">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← {dictionary.kanban.backToHome}
        </Link>
      </div>
    </main>
  );
}
