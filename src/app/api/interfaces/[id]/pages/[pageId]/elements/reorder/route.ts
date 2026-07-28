import { reorderElements } from "@/lib/interfaces";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; pageId: string }> },
) {
  const { pageId } = await params;
  const body = await request.json().catch(() => null);
  const orderedIds = Array.isArray(body?.orderedIds) ? body.orderedIds : null;

  if (!orderedIds || orderedIds.some((v: unknown) => typeof v !== "string")) {
    return NextResponse.json(
      { error: "orderedIds must be an array of element ids" },
      { status: 400 },
    );
  }

  try {
    const elements = await reorderElements(pageId, orderedIds);
    return NextResponse.json({ elements });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to reorder elements",
      },
      { status: 400 },
    );
  }
}
