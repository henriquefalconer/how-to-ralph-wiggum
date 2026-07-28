import { listAutomationRuns } from "@/lib/automations";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const runs = await listAutomationRuns(id);
  return NextResponse.json({ runs });
}
