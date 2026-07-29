import { GeneralSettingsPage as GeneralSettingsPageContent } from "@/components/GeneralSettingsPage";
import { ManageTabs } from "@/components/ManageTabs";
import { TopNav } from "@/components/TopNav";
import { listStartFormFields } from "@/lib/cards";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { getTranslations } from "@/lib/i18n/server";
import { getPipe } from "@/lib/pipes";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export default async function GeneralSettingsPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { locale, dictionary } = await getTranslations();
  const pipe = await getPipe(id);
  if (!pipe) {
    notFound();
  }

  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, pipe.orgId));
  const startFormFields = await listStartFormFields(pipe.id);

  return (
    <main className="min-h-screen bg-[#F5F6F8]">
      <TopNav locale={locale} dictionary={dictionary} />
      <ManageTabs pipeId={pipe.id} active="general" dictionary={dictionary} />
      <GeneralSettingsPageContent
        pipe={pipe}
        orgName={org?.name ?? ""}
        startFormFields={startFormFields}
        dictionary={dictionary}
      />
    </main>
  );
}
