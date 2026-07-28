import { createCard, listCardsForPipe } from "@/lib/cards";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cards = await listCardsForPipe(id);
  return NextResponse.json({ cards });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const phaseId = typeof body?.phaseId === "string" ? body.phaseId : "";
  const values =
    body?.values && typeof body.values === "object" ? body.values : {};

  if (!phaseId) {
    return NextResponse.json({ error: "phaseId is required" }, { status: 400 });
  }

  try {
    const card = await createCard(id, phaseId, values);
    return NextResponse.json({ card }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create card" },
      { status: 400 },
    );
  }
}
