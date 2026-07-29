import { ManageTabs } from "@/components/ManageTabs";
import { MembersPage as MembersPageContent } from "@/components/MembersPage";
import { TopNav } from "@/components/TopNav";
import { getTranslations } from "@/lib/i18n";
import { ensureSelfMembership, listMembers } from "@/lib/pipe-members";
import { getPipeWithPhases } from "@/lib/pipes";
import { notFound } from "next/navigation";

export default async function PipeMembersPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { locale, dictionary } = await getTranslations();
  const result = await getPipeWithPhases(id);
  if (!result) {
    notFound();
  }
  const { pipe } = result;

  await ensureSelfMembership(pipe.orgId, pipe.id);
  const members = await listMembers(pipe.id);

  return (
    <main className="min-h-screen bg-[#F5F6F8]">
      <TopNav locale={locale} dictionary={dictionary} />
      <ManageTabs pipeId={pipe.id} active="members" dictionary={dictionary} />
      <MembersPageContent
        pipeId={pipe.id}
        pipeName={pipe.name}
        members={members}
        dictionary={dictionary}
      />
    </main>
  );
}
