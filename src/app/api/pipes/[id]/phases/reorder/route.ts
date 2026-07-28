import { reorderPhases } from "@/lib/phases";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const orderedIds = Array.isArray(body?.orderedIds) ? body.orderedIds : null;

  if (!orderedIds || orderedIds.some((v: unknown) => typeof v !== "string")) {
    return NextResponse.json(
      { error: "orderedIds must be an array of phase ids" },
      { status: 400 },
    );
  }

  try {
    const phases = await reorderPhases(id, orderedIds);
    return NextResponse.json({ phases });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to reorder phases",
      },
      { status: 400 },
    );
  }
}
