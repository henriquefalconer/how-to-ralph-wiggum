import { db } from "@/lib/db";
import { pdfTemplates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function createPdfTemplate(
  pipeId: string,
  title: string,
  body: string,
) {
  const [template] = await db
    .insert(pdfTemplates)
    .values({
      pipeId,
      title,
      body,
      enabled: false,
    })
    .returning();

  return template;
}

export async function listPdfTemplates(pipeId: string) {
  const templates = await db
    .select()
    .from(pdfTemplates)
    .where(eq(pdfTemplates.pipeId, pipeId))
    .orderBy(pdfTemplates.createdAt);

  return templates;
}

export async function getPdfTemplate(templateId: string) {
  const [template] = await db
    .select()
    .from(pdfTemplates)
    .where(eq(pdfTemplates.id, templateId));

  return template;
}

export async function updatePdfTemplate(
  templateId: string,
  updates: {
    title?: string;
    body?: string;
    enabled?: boolean;
  },
) {
  const [template] = await db
    .update(pdfTemplates)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(pdfTemplates.id, templateId))
    .returning();

  return template;
}

export async function deletePdfTemplate(templateId: string) {
  await db.delete(pdfTemplates).where(eq(pdfTemplates.id, templateId));
}

export function renderTemplateBody(
  body: string,
  cardData: Record<string, string>,
): string {
  let rendered = body;

  for (const [fieldId, value] of Object.entries(cardData)) {
    const tokenPattern = new RegExp(`\\{\\{field:${fieldId}\\}\\}`, "g");
    rendered = rendered.replace(tokenPattern, value || "");
  }

  return rendered;
}

export function getTokensFromBody(body: string): string[] {
  const tokenPattern = /\{\{field:([^}]+)\}\}/g;
  const tokens: string[] = [];

  for (const match of body.matchAll(tokenPattern)) {
    tokens.push(match[1]);
  }

  return [...new Set(tokens)]; // Deduplicate
}
