import {
  deleteReport,
  getReport,
  getReportResults,
  updateReport,
} from "@/lib/reports";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const { reportId } = await params;
  const report = await getReport(reportId);
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  const results = await getReportResults(reportId);
  return NextResponse.json({ report, results });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const { reportId } = await params;
  const body = await request.json().catch(() => null);

  try {
    const report = await updateReport(reportId, {
      ...(typeof body?.name === "string" ? { name: body.name } : {}),
      ...(Array.isArray(body?.filters) ? { filters: body.filters } : {}),
      ...(Array.isArray(body?.visibleColumnFieldIds)
        ? { visibleColumnFieldIds: body.visibleColumnFieldIds }
        : {}),
    });
    return NextResponse.json({ report });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update report" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const { reportId } = await params;
  try {
    await deleteReport(reportId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete report" },
      { status: 404 },
    );
  }
}
