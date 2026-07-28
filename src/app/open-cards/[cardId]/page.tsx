import { CardDetailView } from "@/components/CardDetailView";
import { TopNav } from "@/components/TopNav";
import { getCardDetail } from "@/lib/cards";
import { getTranslations } from "@/lib/i18n";
import { notFound } from "next/navigation";

export default async function CardDetailPage({
  params,
}: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await params;
  const { locale, dictionary } = await getTranslations();
  const detail = await getCardDetail(cardId);

  if (!detail) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#F5F6F8]">
      <TopNav locale={locale} dictionary={dictionary} />
      <CardDetailView
        pipeId={detail.pipe.id}
        detail={detail}
        dictionary={dictionary}
      />
    </main>
  );
}
