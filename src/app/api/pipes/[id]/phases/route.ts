import { createPhase, listPhases } from "@/lib/phases";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const phases = await listPhases(id);
  return NextResponse.json({ phases });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name : "";

  if (!name.trim()) {
    return NextResponse.json(
      { error: "Phase name is required" },
      { status: 400 },
    );
  }

  try {
    const phase = await createPhase(id, name);
    return NextResponse.json({ phase }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create phase" },
      { status: 400 },
    );
  }
}
