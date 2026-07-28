import { PipesSection } from "@/components/PipesSection";
import { TopNav } from "@/components/TopNav";
import { getTranslations } from "@/lib/i18n";
import { getDefaultOrgId, listPipes } from "@/lib/pipes";

export default async function HomePage() {
  const { locale, dictionary } = await getTranslations();
  const orgId = await getDefaultOrgId();
  const pipes = await listPipes(orgId);

  return (
    <main className="min-h-screen bg-[#F5F6F8]">
      <TopNav locale={locale} dictionary={dictionary} />
      <div className="mx-auto max-w-5xl px-8 py-8">
        <PipesSection pipes={pipes} dictionary={dictionary} locale={locale} />
      </div>
    </main>
  );
}
