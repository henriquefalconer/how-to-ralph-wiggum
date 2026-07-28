import { deleteElement, updateElementConfig } from "@/lib/interfaces";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  {
    params,
  }: { params: Promise<{ id: string; pageId: string; elementId: string }> },
) {
  const { elementId } = await params;
  const body = await request.json().catch(() => null);
  const config =
    body?.config && typeof body.config === "object" ? body.config : null;

  if (!config) {
    return NextResponse.json({ error: "config is required" }, { status: 400 });
  }

  try {
    const element = await updateElementConfig(elementId, config);
    return NextResponse.json({ element });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to update element",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  {
    params,
  }: { params: Promise<{ id: string; pageId: string; elementId: string }> },
) {
  const { elementId } = await params;
  try {
    await deleteElement(elementId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to delete element",
      },
      { status: 400 },
    );
  }
}
