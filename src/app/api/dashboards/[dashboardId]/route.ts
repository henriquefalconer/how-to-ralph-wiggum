import { deleteDashboard, getDashboard, listCharts } from "@/lib/dashboards";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ dashboardId: string }> },
) {
  const { dashboardId } = await params;
  const dashboard = await getDashboard(dashboardId);
  if (!dashboard) {
    return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
  }
  const charts = await listCharts(dashboardId);
  return NextResponse.json({ dashboard, charts });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ dashboardId: string }> },
) {
  const { dashboardId } = await params;
  try {
    await deleteDashboard(dashboardId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to delete dashboard",
      },
      { status: 404 },
    );
  }
}
