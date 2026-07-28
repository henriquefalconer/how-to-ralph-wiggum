import { InterfacesList } from "@/components/InterfacesList";
import { TopNav } from "@/components/TopNav";
import { getTranslations } from "@/lib/i18n";
import { listInterfacesWithFirstPage } from "@/lib/interfaces";
import { getDefaultOrgId } from "@/lib/pipes";

export default async function InterfacesPage() {
  const { locale, dictionary } = await getTranslations();
  const orgId = await getDefaultOrgId();
  const interfaces = await listInterfacesWithFirstPage(orgId);

  return (
    <main className="min-h-screen bg-[#F5F6F8]">
      <TopNav locale={locale} dictionary={dictionary} />
      <div className="mx-auto max-w-5xl px-8 py-8">
        <InterfacesList
          interfaces={interfaces}
          dictionary={dictionary}
          locale={locale}
        />
      </div>
    </main>
  );
}
