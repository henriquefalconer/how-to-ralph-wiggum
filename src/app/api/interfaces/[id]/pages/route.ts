import { createPage, listPages } from "@/lib/interfaces";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const pages = await listPages(id);
  return NextResponse.json({ pages });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name : "";

  try {
    const page = await createPage(id, name);
    return NextResponse.json({ page }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create page" },
      { status: 400 },
    );
  }
}
