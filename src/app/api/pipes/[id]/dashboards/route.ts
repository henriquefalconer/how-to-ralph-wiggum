import {
  createDashboard,
  listDashboardsWithChartCounts,
} from "@/lib/dashboards";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const dashboards = await listDashboardsWithChartCounts(id);
  return NextResponse.json({ dashboards });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name : "";

  try {
    const dashboard = await createDashboard(id, name);
    return NextResponse.json({ dashboard }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to create dashboard",
      },
      { status: 400 },
    );
  }
}
