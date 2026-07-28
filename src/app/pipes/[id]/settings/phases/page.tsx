import { getPipeWithPhases } from "@/lib/pipes";
import { notFound, redirect } from "next/navigation";

export default async function PhasesSettingsIndexPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getPipeWithPhases(id);

  if (!result || result.phases.length === 0) {
    notFound();
  }

  redirect(`/pipes/${id}/settings/phases/${result.phases[0].id}`);
}
