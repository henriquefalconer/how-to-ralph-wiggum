import { isDashboardChartMetric, previewChartData } from "@/lib/dashboards";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (
    typeof body?.metric !== "string" ||
    !isDashboardChartMetric(body.metric)
  ) {
    return NextResponse.json({ error: "Unknown metric" }, { status: 400 });
  }

  try {
    const data = await previewChartData(id, {
      metric: body.metric,
      dimensionFieldId:
        typeof body?.dimensionFieldId === "string"
          ? body.dimensionFieldId
          : null,
      timeFieldId:
        typeof body?.timeFieldId === "string" ? body.timeFieldId : undefined,
      timeRange:
        typeof body?.timeRange === "string" ? body.timeRange : undefined,
      timeGrouping: body?.timeGrouping ?? null,
      filters: Array.isArray(body?.filters) ? body.filters : [],
    });
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to preview chart",
      },
      { status: 400 },
    );
  }
}
