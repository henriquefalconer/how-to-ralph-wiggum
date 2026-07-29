import { db } from "@/lib/db";
import { cardFieldValues, cards, pipes } from "@/lib/db/schema";
import { getPdfTemplate, renderTemplateBody } from "@/lib/pdf-templates";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; templateId: string }> },
) {
  const { id: pipeId, templateId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const cardId = searchParams.get("cardId");

  if (!cardId) {
    return NextResponse.json(
      { error: "cardId query parameter is required" },
      { status: 400 },
    );
  }

  // Verify pipe exists
  const [pipe] = await db.select().from(pipes).where(eq(pipes.id, pipeId));
  if (!pipe) {
    return NextResponse.json({ error: "Pipe not found" }, { status: 404 });
  }

  // Get template
  const template = await getPdfTemplate(templateId);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Get card and verify it belongs to the pipe
  const [card] = await db
    .select()
    .from(cards)
    .where(and(eq(cards.id, cardId), eq(cards.pipeId, pipeId)));

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  // Get all field values for this card
  const fieldValues = await db
    .select()
    .from(cardFieldValues)
    .where(eq(cardFieldValues.cardId, cardId));

  // Build a map of field values
  const cardData: Record<string, string> = {
    _title: card.title,
  };

  for (const fv of fieldValues) {
    cardData[fv.fieldId] = fv.value;
  }

  // Render template
  const renderedHtml = renderTemplateBody(template.body, cardData);

  return NextResponse.json({
    template: {
      id: template.id,
      title: template.title,
      body: template.body,
      enabled: template.enabled,
    },
    rendered: {
      html: renderedHtml,
      cardTitle: card.title,
    },
  });
}
