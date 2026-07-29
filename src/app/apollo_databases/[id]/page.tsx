import { DatabaseGrid } from "@/components/DatabaseGrid";
import { TopNav } from "@/components/TopNav";
import { getTranslations } from "@/lib/i18n/server";
import { getTable, listRecordsForTable, listTableFields } from "@/lib/tables";
import { notFound } from "next/navigation";

export default async function DatabasePage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { locale, dictionary } = await getTranslations();

  const table = await getTable(id);
  if (!table) notFound();

  const fields = await listTableFields(id);
  const records = await listRecordsForTable(id);

  return (
    <main className="min-h-screen bg-[#F5F6F8]">
      <TopNav locale={locale} dictionary={dictionary} />
      <div className="mx-auto max-w-6xl px-8 py-8">
        <DatabaseGrid
          table={table}
          fields={fields}
          initialRecords={records}
          dictionary={dictionary}
        />
      </div>
    </main>
  );
}
