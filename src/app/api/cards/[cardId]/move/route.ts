import { moveCardToPhase } from "@/lib/cards";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ cardId: string }> },
) {
  const { cardId } = await params;
  const body = await request.json().catch(() => null);
  const toPhaseId = typeof body?.toPhaseId === "string" ? body.toPhaseId : "";

  if (!toPhaseId) {
    return NextResponse.json(
      { error: "toPhaseId is required" },
      { status: 400 },
    );
  }

  try {
    const card = await moveCardToPhase(cardId, toPhaseId);
    return NextResponse.json({ card });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to move card" },
      { status: 400 },
    );
  }
}
