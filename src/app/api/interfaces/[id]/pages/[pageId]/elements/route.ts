import {
  INTERFACE_ELEMENT_TYPES,
  type InterfaceElementType,
  createElement,
  listElements,
} from "@/lib/interfaces";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; pageId: string }> },
) {
  const { pageId } = await params;
  const elements = await listElements(pageId);
  return NextResponse.json({ elements });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; pageId: string }> },
) {
  const { pageId } = await params;
  const body = await request.json().catch(() => null);
  const type = typeof body?.type === "string" ? body.type : "";
  const config =
    body?.config && typeof body.config === "object" ? body.config : {};

  if (!(INTERFACE_ELEMENT_TYPES as readonly string[]).includes(type)) {
    return NextResponse.json(
      { error: `Unknown element type: ${type}` },
      { status: 400 },
    );
  }

  try {
    const element = await createElement(
      pageId,
      type as InterfaceElementType,
      config,
    );
    return NextResponse.json({ element }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to create element",
      },
      { status: 400 },
    );
  }
}
