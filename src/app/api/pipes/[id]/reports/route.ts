import { createReport, listReportsWithCounts } from "@/lib/reports";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const reports = await listReportsWithCounts(id);
  return NextResponse.json({ reports });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const name = typeof body?.name === "string" ? body.name : "";
  const filters = Array.isArray(body?.filters) ? body.filters : [];
  const visibleColumnFieldIds = Array.isArray(body?.visibleColumnFieldIds)
    ? body.visibleColumnFieldIds
    : [];

  try {
    const report = await createReport(id, {
      name,
      filters,
      visibleColumnFieldIds,
    });
    return NextResponse.json({ report }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create report" },
      { status: 400 },
    );
  }
}
