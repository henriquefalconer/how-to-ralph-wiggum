import { getPage, listElements, updatePage } from "@/lib/interfaces";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; pageId: string }> },
) {
  const { pageId } = await params;
  const page = await getPage(pageId);
  if (!page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }
  const elements = await listElements(pageId);
  return NextResponse.json({ page, elements });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; pageId: string }> },
) {
  const { pageId } = await params;
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name : undefined;
  const showHeader =
    typeof body?.showHeader === "boolean" ? body.showHeader : undefined;

  try {
    const page = await updatePage(pageId, { name, showHeader });
    return NextResponse.json({ page });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update page" },
      { status: 400 },
    );
  }
}
