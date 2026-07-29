import { db } from "@/lib/db";
import { cards, interfacePageElements } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { InterfacePageElement } from "./interfaces";

export async function getAssistantScope(pageId: string) {
  const elements = await db
    .select()
    .from(interfacePageElements)
    .where(eq(interfacePageElements.pageId, pageId));

  const scope: Array<{ type: "pipe" | "database"; id: string }> = [];
  const seen = new Set<string>();

  for (const element of elements) {
    const config = element.config as Record<string, unknown>;
    if (element.type === "data_table" && config.sourceType && config.sourceId) {
      const key = `${config.sourceType}:${config.sourceId}`;
      if (!seen.has(key)) {
        seen.add(key);
        scope.push({
          type: config.sourceType as "pipe" | "database",
          id: config.sourceId as string,
        });
      }
    } else if (
      element.type === "form_link" &&
      config.sourceType &&
      config.sourceId
    ) {
      const key = `${config.sourceType}:${config.sourceId}`;
      if (!seen.has(key)) {
        seen.add(key);
        scope.push({
          type: config.sourceType as "pipe" | "database",
          id: config.sourceId as string,
        });
      }
    }
  }

  return scope;
}

export async function resolveCannedPrompt(
  prompt:
    | "ver_minhas_solicitacoes"
    | "iniciar_solicitacao"
    | "resumir_politicas"
    | "mostrar_opcoes",
  viewerId: string,
  scope: Array<{ type: "pipe" | "database"; id: string }>,
) {
  switch (prompt) {
    case "ver_minhas_solicitacoes": {
      if (scope.length === 0) return [];
      const result = [];
      for (const source of scope) {
        if (source.type === "pipe") {
          const pipeCards = await db
            .select({ id: cards.id, title: cards.title })
            .from(cards)
            .where(eq(cards.pipeId, source.id))
            .limit(10);
          result.push(
            ...pipeCards.map((c: { id: string; title: string }) => ({
              ...c,
              source: source.id,
            })),
          );
        }
      }
      return result.slice(0, 10);
    }

    case "iniciar_solicitacao": {
      return {
        message:
          "To start a request, navigate to a pipe and click the 'Create card' button. You can fill in the form with your details.",
      };
    }

    case "resumir_politicas": {
      return {
        message:
          "To summarize policies and information, refer to the documents and guidelines section of your organization.",
      };
    }

    case "mostrar_opcoes": {
      return {
        message:
          "You can view your requests, create new ones, and manage your submissions using the interface elements on this page.",
      };
    }

    default:
      return { message: "I did not understand that request." };
  }
}
