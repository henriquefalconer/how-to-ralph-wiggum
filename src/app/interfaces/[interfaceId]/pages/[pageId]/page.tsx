import { InterfaceLiveView } from "@/components/InterfaceLiveView";
import { TopNav } from "@/components/TopNav";
import { getTranslations } from "@/lib/i18n/server";
import { getInterface, getPage, listElements } from "@/lib/interfaces";
import { notFound } from "next/navigation";

export default async function InterfaceLivePage({
  params,
}: {
  params: Promise<{ interfaceId: string; pageId: string }>;
}) {
  const { interfaceId, pageId } = await params;
  const { locale, dictionary } = await getTranslations();

  const iface = await getInterface(interfaceId);
  const page = await getPage(pageId);
  if (!iface || !page || page.interfaceId !== interfaceId) {
    notFound();
  }

  const elements = await listElements(pageId);

  return (
    <main className="min-h-screen bg-[#F5F6F8]">
      <TopNav locale={locale} dictionary={dictionary} />
      {page.showHeader && (
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <h1 className="text-lg font-semibold text-gray-900">{iface.name}</h1>
        </div>
      )}
      <InterfaceLiveView
        interfaceId={interfaceId}
        pageId={pageId}
        elements={elements}
        dictionary={dictionary}
      />
    </main>
  );
}
