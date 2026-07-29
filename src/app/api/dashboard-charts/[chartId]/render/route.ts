import { renderChart } from "@/lib/dashboards";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ chartId: string }> },
) {
  const { chartId } = await params;
  try {
    const data = await renderChart(chartId);
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to render chart" },
      { status: 404 },
    );
  }
}
