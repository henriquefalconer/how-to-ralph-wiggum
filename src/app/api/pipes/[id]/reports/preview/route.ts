import { getReportRows } from "@/lib/reports";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const filters = Array.isArray(body?.filters) ? body.filters : [];

  try {
    const results = await getReportRows(id, filters);
    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to preview report",
      },
      { status: 400 },
    );
  }
}
