import { RecordDetailView } from "@/components/RecordDetailView";
import { TopNav } from "@/components/TopNav";
import { getTranslations } from "@/lib/i18n";
import { getRecordDetail } from "@/lib/tables";
import { notFound } from "next/navigation";

export default async function RecordDetailPage({
  params,
}: { params: Promise<{ id: string; recordId: string }> }) {
  const { id, recordId } = await params;
  const { locale, dictionary } = await getTranslations();

  const detail = await getRecordDetail(recordId);
  if (!detail || detail.table.id !== id) notFound();

  const titleFieldId =
    detail.table.titleFieldId ?? detail.fields[0]?.id ?? null;

  return (
    <main className="min-h-screen bg-[#F5F6F8]">
      <TopNav locale={locale} dictionary={dictionary} />
      <div className="px-8 py-8">
        <RecordDetailView
          tableId={id}
          recordId={recordId}
          fields={detail.fields}
          initialValues={detail.values}
          titleFieldId={titleFieldId}
          dictionary={dictionary}
        />
      </div>
    </main>
  );
}
