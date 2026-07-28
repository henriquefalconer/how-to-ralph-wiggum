import {
  type FormLinkConfig,
  getElement,
  getFormLinkTarget,
} from "@/lib/interfaces";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  {
    params,
  }: { params: Promise<{ id: string; pageId: string; elementId: string }> },
) {
  const { elementId } = await params;

  const element = await getElement(elementId);
  if (!element || element.type !== "form_link") {
    return NextResponse.json(
      { error: "Form widget not found" },
      { status: 404 },
    );
  }

  const config = element.config as unknown as FormLinkConfig;
  if (!config.sourceId) {
    return NextResponse.json(
      { error: "Widget is not bound yet" },
      { status: 400 },
    );
  }

  const target = await getFormLinkTarget(config.sourceId);
  if (!target) {
    return NextResponse.json({ error: "Pipe not found" }, { status: 404 });
  }

  return NextResponse.json({ target, config });
}
