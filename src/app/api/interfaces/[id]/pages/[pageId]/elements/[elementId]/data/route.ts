import {
  type DataTableConfig,
  getDataTableRows,
  getElement,
} from "@/lib/interfaces";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  {
    params,
  }: { params: Promise<{ id: string; pageId: string; elementId: string }> },
) {
  const { elementId } = await params;
  const { searchParams } = new URL(request.url);
  const viewerId = searchParams.get("viewerId") ?? "anonymous";

  const element = await getElement(elementId);
  if (!element || element.type !== "data_table") {
    return NextResponse.json(
      { error: "Data table element not found" },
      { status: 404 },
    );
  }

  try {
    const config = element.config as unknown as DataTableConfig;
    if (!config.sourceType || !config.sourceId) {
      return NextResponse.json({ rows: [], total: 0 });
    }
    const result = await getDataTableRows(config, viewerId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to query data" },
      { status: 400 },
    );
  }
}
