import { deleteChart, updateChart } from "@/lib/dashboards";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ chartId: string }> },
) {
  const { chartId } = await params;
  const body = await request.json().catch(() => null);

  try {
    const chart = await updateChart(chartId, {
      ...(typeof body?.title === "string" ? { title: body.title } : {}),
      ...(typeof body?.metric === "string" ? { metric: body.metric } : {}),
      ...(body?.dimensionFieldId !== undefined
        ? { dimensionFieldId: body.dimensionFieldId }
        : {}),
      ...(typeof body?.timeFieldId === "string"
        ? { timeFieldId: body.timeFieldId }
        : {}),
      ...(typeof body?.timeRange === "string"
        ? { timeRange: body.timeRange }
        : {}),
      ...(body?.timeGrouping !== undefined
        ? { timeGrouping: body.timeGrouping }
        : {}),
      ...(typeof body?.vizType === "string" ? { vizType: body.vizType } : {}),
      ...(Array.isArray(body?.filters) ? { filters: body.filters } : {}),
      ...(body?.position && typeof body.position === "object"
        ? { position: body.position }
        : {}),
    });
    return NextResponse.json({ chart });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update chart" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ chartId: string }> },
) {
  const { chartId } = await params;
  try {
    await deleteChart(chartId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete chart" },
      { status: 404 },
    );
  }
}
