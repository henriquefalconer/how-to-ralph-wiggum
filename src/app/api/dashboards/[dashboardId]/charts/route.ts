import { createChart } from "@/lib/dashboards";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ dashboardId: string }> },
) {
  const { dashboardId } = await params;
  const body = await request.json().catch(() => null);

  try {
    const chart = await createChart(dashboardId, {
      title: typeof body?.title === "string" ? body.title : "",
      metric: body?.metric,
      dimensionFieldId:
        typeof body?.dimensionFieldId === "string"
          ? body.dimensionFieldId
          : null,
      timeFieldId:
        typeof body?.timeFieldId === "string" ? body.timeFieldId : undefined,
      timeRange:
        typeof body?.timeRange === "string" ? body.timeRange : undefined,
      timeGrouping: body?.timeGrouping ?? null,
      vizType: body?.vizType,
      filters: Array.isArray(body?.filters) ? body.filters : [],
      position:
        body?.position && typeof body.position === "object"
          ? body.position
          : undefined,
    });
    return NextResponse.json({ chart }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create chart" },
      { status: 400 },
    );
  }
}
