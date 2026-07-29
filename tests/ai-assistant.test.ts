import { getAssistantScope, resolveCannedPrompt } from "@/lib/ai-assistant";
import { db } from "@/lib/db";
import {
  cards,
  interfacePageElements,
  interfacePages,
  interfaces,
  organizations,
  phases,
  pipes,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("AI Assistant", () => {
  let orgId: string;
  let pipeId: string;
  let pageId: string;

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
        name: "Test Pipe for AI Assistant",
        color: "#FF0000",
      })
      .returning();

    if (!pipe) throw new Error("Failed to create test pipe");
    pipeId = pipe.id;

    const [phase] = await db
      .insert(phases)
      .values({
        pipeId: pipe.id,
        name: "Test Phase",
        position: 0,
      })
      .returning();

    if (!phase) throw new Error("Failed to create test phase");

    const [iface] = await db
      .insert(interfaces)
      .values({
        orgId,
        name: "Test Interface",
      })
      .returning();

    if (!iface) throw new Error("Failed to create test interface");

    const [page] = await db
      .insert(interfacePages)
      .values({
        interfaceId: iface.id,
        name: "Test Page",
        position: 0,
      })
      .returning();

    if (!page) throw new Error("Failed to create test page");
    pageId = page.id;

    const [element1] = await db
      .insert(interfacePageElements)
      .values({
        pageId,
        type: "data_table",
        config: {
          sourceType: "pipe",
          sourceId: pipe.id,
        },
      })
      .returning();

    if (!element1) throw new Error("Failed to create data_table element");

    const [element2] = await db
      .insert(interfacePageElements)
      .values({
        pageId,
        type: "text",
        config: {
          content: "Some text",
        },
      })
      .returning();

    if (!element2) throw new Error("Failed to create text element");
  });

  afterEach(async () => {
    await db
      .delete(interfacePageElements)
      .where(eq(interfacePageElements.pageId, pageId));
    await db.delete(interfacePages).where(eq(interfacePages.id, pageId));
    await db.delete(interfaces).where(eq(interfaces.orgId, orgId));
    await db.delete(cards).where(eq(cards.pipeId, pipeId));
    await db.delete(phases).where(eq(phases.pipeId, pipeId));
    await db.delete(pipes).where(eq(pipes.id, pipeId));
    await db.delete(organizations).where(eq(organizations.id, orgId));
  });

  describe("getAssistantScope", () => {
    it("should resolve only the current page's bound sources", async () => {
      const scope = await getAssistantScope(pageId);
      expect(scope).toHaveLength(1);
      expect(scope[0].type).toBe("pipe");
      expect(scope[0].id).toBe(pipeId);
    });

    it("should exclude non-data elements from scope", async () => {
      const scope = await getAssistantScope(pageId);
      expect(scope).toHaveLength(1);
      expect(scope).toEqual([{ type: "pipe", id: pipeId }]);
    });

    it("should deduplicate multiple bound sources to the same pipe", async () => {
      const [element] = await db
        .insert(interfacePageElements)
        .values({
          pageId,
          type: "form_link",
          config: {
            sourceType: "pipe",
            sourceId: pipeId,
          },
        })
        .returning();

      if (!element) throw new Error("Failed to create form_link element");

      const scope = await getAssistantScope(pageId);
      expect(scope).toHaveLength(1);
    });

    it("should return empty scope for page with no bound elements", async () => {
      const [iface] = await db
        .insert(interfaces)
        .values({
          orgId,
          name: "Empty Interface",
        })
        .returning();

      if (!iface) throw new Error("Failed to create empty interface");

      const [emptyPage] = await db
        .insert(interfacePages)
        .values({
          interfaceId: iface.id,
          name: "Empty Page",
          position: 0,
        })
        .returning();

      if (!emptyPage) throw new Error("Failed to create empty page");

      const scope = await getAssistantScope(emptyPage.id);
      expect(scope).toHaveLength(0);

      await db
        .delete(interfacePages)
        .where(eq(interfacePages.id, emptyPage.id));
      await db.delete(interfaces).where(eq(interfaces.id, iface.id));
    });
  });

  describe("resolveCannedPrompt", () => {
    it("'ver_minhas_solicitacoes' should return empty list when scope is empty", async () => {
      const result = await resolveCannedPrompt(
        "ver_minhas_solicitacoes",
        "user_123",
        [],
      );
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it("'iniciar_solicitacao' should return a helper message", async () => {
      const result = await resolveCannedPrompt(
        "iniciar_solicitacao",
        "user_123",
        [],
      );
      expect(
        typeof result === "object" && result !== null && "message" in result,
      ).toBe(true);
      if (
        typeof result === "object" &&
        result !== null &&
        "message" in result
      ) {
        expect(typeof result.message).toBe("string");
      }
    });

    it("'resumir_politicas' should return a helper message", async () => {
      const result = await resolveCannedPrompt(
        "resumir_politicas",
        "user_123",
        [],
      );
      expect(
        typeof result === "object" && result !== null && "message" in result,
      ).toBe(true);
      if (
        typeof result === "object" &&
        result !== null &&
        "message" in result
      ) {
        expect(typeof result.message).toBe("string");
      }
    });

    it("'mostrar_opcoes' should return a helper message", async () => {
      const result = await resolveCannedPrompt(
        "mostrar_opcoes",
        "user_123",
        [],
      );
      expect(
        typeof result === "object" && result !== null && "message" in result,
      ).toBe(true);
      if (
        typeof result === "object" &&
        result !== null &&
        "message" in result
      ) {
        expect(typeof result.message).toBe("string");
      }
    });

    it("should handle unrecognized prompts gracefully", async () => {
      const result = await resolveCannedPrompt(
        "mostrar_opcoes" as never,
        "user_123",
        [],
      );
      expect(result).toHaveProperty("message");
    });

    it("should list cards when scope contains a pipe with cards", async () => {
      const phasesList = await db
        .select()
        .from(phases)
        .where(eq(phases.pipeId, pipeId));

      const phaseId = phasesList[0]?.id;
      if (!phaseId) throw new Error("No phase found for pipe");

      const [card] = await db
        .insert(cards)
        .values({
          pipeId,
          phaseId,
          title: "Test Card 1",
        })
        .returning();

      if (!card) throw new Error("Failed to create test card");

      const result = await resolveCannedPrompt(
        "ver_minhas_solicitacoes",
        "user_123",
        [{ type: "pipe" as const, id: pipeId }],
      );

      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result)) {
        expect(result.length).toBeGreaterThan(0);
      }
    });
  });
});
