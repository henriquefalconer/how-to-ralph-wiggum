import { db } from "@/lib/db";
import { organizations, pdfTemplates, pipes } from "@/lib/db/schema";
import {
  createPdfTemplate,
  deletePdfTemplate,
  getPdfTemplate,
  getTokensFromBody,
  listPdfTemplates,
  renderTemplateBody,
  updatePdfTemplate,
} from "@/lib/pdf-templates";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("PDF Templates", () => {
  let orgId: string;
  let pipeId: string;

  beforeEach(async () => {
    const [org] = await db
      .insert(organizations)
      .values({ name: "Test Org" })
      .returning();
    orgId = org.id;

    const [pipe] = await db
      .insert(pipes)
      .values({
        orgId,
        name: "Test Pipe",
        color: "#2E68D9",
      })
      .returning();
    pipeId = pipe.id;
  });

  afterEach(async () => {
    await db.delete(pdfTemplates).where(eq(pdfTemplates.pipeId, pipeId));
    await db.delete(pipes).where(eq(pipes.id, pipeId));
    await db.delete(organizations).where(eq(organizations.id, orgId));
  });

  it("creates a new PDF template with enabled=false by default", async () => {
    const body = "<p>Template body with {{field:solicitante_nome}}</p>";
    const template = await createPdfTemplate(pipeId, "Recibo de Compra", body);

    expect(template).toBeDefined();
    expect(template.title).toBe("Recibo de Compra");
    expect(template.body).toBe(body);
    expect(template.enabled).toBe(false);
  });

  it("lists all templates for a pipe ordered by creation date", async () => {
    await createPdfTemplate(pipeId, "Template 1", "<p>Body 1</p>");
    await createPdfTemplate(pipeId, "Template 2", "<p>Body 2</p>");
    await createPdfTemplate(pipeId, "Template 3", "<p>Body 3</p>");

    const templates = await listPdfTemplates(pipeId);

    expect(templates).toHaveLength(3);
    expect(templates[0].title).toBe("Template 1");
    expect(templates[1].title).toBe("Template 2");
    expect(templates[2].title).toBe("Template 3");
  });

  it("retrieves a single template by ID", async () => {
    const created = await createPdfTemplate(
      pipeId,
      "Test Template",
      "<p>Body</p>",
    );
    const retrieved = await getPdfTemplate(created.id);

    expect(retrieved).toBeDefined();
    expect(retrieved.id).toBe(created.id);
    expect(retrieved.title).toBe("Test Template");
  });

  it("updates a template title and enabled status", async () => {
    const template = await createPdfTemplate(
      pipeId,
      "Original Title",
      "<p>Body</p>",
    );

    const updated = await updatePdfTemplate(template.id, {
      title: "Updated Title",
      enabled: true,
    });

    expect(updated.title).toBe("Updated Title");
    expect(updated.enabled).toBe(true);
  });

  it("deletes a template", async () => {
    const template = await createPdfTemplate(
      pipeId,
      "To Delete",
      "<p>Body</p>",
    );

    await deletePdfTemplate(template.id);

    const retrieved = await getPdfTemplate(template.id);
    expect(retrieved).toBeUndefined();
  });

  it("renders template body with field token substitution", () => {
    const body = "<p>Solicitante: {{field:solicitante_nome}}</p>";
    const cardData = { solicitante_nome: "João Silva" };

    const rendered = renderTemplateBody(body, cardData);

    expect(rendered).toBe("<p>Solicitante: João Silva</p>");
  });

  it("handles multiple tokens in template body", () => {
    const body =
      "<p>{{field:solicitante_nome}} - {{field:data_solicitacao}}</p>";
    const cardData = {
      solicitante_nome: "João Silva",
      data_solicitacao: "2026-07-29",
    };

    const rendered = renderTemplateBody(body, cardData);

    expect(rendered).toBe("<p>João Silva - 2026-07-29</p>");
  });

  it("leaves missing tokens empty", () => {
    const body =
      "<p>Solicitante: {{field:solicitante_nome}} - {{field:missing}}</p>";
    const cardData = { solicitante_nome: "João Silva" };

    const rendered = renderTemplateBody(body, cardData);

    expect(rendered).toBe("<p>Solicitante: João Silva - </p>");
  });

  it("extracts all tokens from template body", () => {
    const body = "<p>{{field:nome}} - {{field:data}} - {{field:nome}}</p>";

    const tokens = getTokensFromBody(body);

    expect(tokens).toHaveLength(2);
    expect(tokens).toContain("nome");
    expect(tokens).toContain("data");
  });

  it("handles template body with no tokens", () => {
    const body = "<p>This is a static template</p>";

    const tokens = getTokensFromBody(body);

    expect(tokens).toHaveLength(0);
  });
});
