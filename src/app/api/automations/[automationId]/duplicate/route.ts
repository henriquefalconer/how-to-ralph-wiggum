import { duplicateAutomation } from "@/lib/automations";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ automationId: string }> },
) {
  const { automationId } = await params;
  try {
    const automation = await duplicateAutomation(automationId);
    return NextResponse.json({ automation }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to duplicate automation",
      },
      { status: 404 },
    );
  }
}
