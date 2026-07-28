import { InterfaceBuilder } from "@/components/InterfaceBuilder";
import { getTranslations } from "@/lib/i18n";
import {
  getInterface,
  getPage,
  listElements,
  listPages,
} from "@/lib/interfaces";
import { listPipes } from "@/lib/pipes";
import { listTables } from "@/lib/tables";
import { notFound } from "next/navigation";

export default async function InterfaceBuilderPage({
  params,
}: {
  params: Promise<{ interfaceId: string; pageId: string }>;
}) {
  const { interfaceId, pageId } = await params;
  const { dictionary } = await getTranslations();

  const iface = await getInterface(interfaceId);
  const page = await getPage(pageId);
  if (!iface || !page || page.interfaceId !== interfaceId) {
    notFound();
  }

  const [pages, elements, pipes, tables] = await Promise.all([
    listPages(interfaceId),
    listElements(pageId),
    listPipes(iface.orgId),
    listTables(iface.orgId),
  ]);

  const catalog = [
    ...pipes.map((p) => ({
      id: p.id,
      name: p.name,
      sourceType: "pipe" as const,
    })),
    ...tables.map((t) => ({
      id: t.id,
      name: t.name,
      sourceType: "database" as const,
    })),
  ];

  return (
    <InterfaceBuilder
      interfaceId={interfaceId}
      page={page}
      pages={pages}
      elements={elements}
      catalog={catalog}
      dictionary={dictionary}
    />
  );
}
