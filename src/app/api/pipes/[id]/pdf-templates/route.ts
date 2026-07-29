import { db } from "@/lib/db";
import { pipes } from "@/lib/db/schema";
import {
  createPdfTemplate,
  deletePdfTemplate,
  listPdfTemplates,
  updatePdfTemplate,
} from "@/lib/pdf-templates";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: pipeId } = await params;

  // Verify pipe exists
  const [pipe] = await db.select().from(pipes).where(eq(pipes.id, pipeId));
  if (!pipe) {
    return NextResponse.json({ error: "Pipe not found" }, { status: 404 });
  }

  const templates = await listPdfTemplates(pipeId);
  return NextResponse.json(templates);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: pipeId } = await params;

  // Verify pipe exists
  const [pipe] = await db.select().from(pipes).where(eq(pipes.id, pipeId));
  if (!pipe) {
    return NextResponse.json({ error: "Pipe not found" }, { status: 404 });
  }

  const { title, body } = await request.json();

  if (!title || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const template = await createPdfTemplate(pipeId, title, body || "");
  return NextResponse.json(template, { status: 201 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: pipeId } = await params;
  const { templateId, title, body, enabled } = await request.json();

  if (!templateId) {
    return NextResponse.json(
      { error: "Template ID is required" },
      { status: 400 },
    );
  }

  const template = await updatePdfTemplate(templateId, {
    title,
    body,
    enabled,
  });

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json(template);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { templateId } = await request.json();

  if (!templateId) {
    return NextResponse.json(
      { error: "Template ID is required" },
      { status: 400 },
    );
  }

  await deletePdfTemplate(templateId);
  return NextResponse.json({ success: true });
}
