import { getPipeWithPhases } from "@/lib/pipes";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await getPipeWithPhases(id);

  if (!result) {
    return NextResponse.json({ error: "Pipe not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}
