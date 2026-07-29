"use client";

import { resolveCannedPrompt } from "@/lib/ai-assistant";
import type { Dictionary } from "@/lib/i18n";
import { useEffect, useState } from "react";

const VIEWER_ID = "anonymous";

export function AIAssistantWidget({
  pageId,
  scope,
  dictionary,
}: {
  pageId: string;
  scope: Array<{ type: "pipe" | "database"; id: string }>;
  dictionary: Dictionary;
}) {
  const [expanded, setExpanded] = useState(true);
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(`ai_assistant_expanded_${pageId}`);
    if (stored !== null) {
      setExpanded(stored === "true");
    }
  }, [pageId]);

  const handleExpandedChange = (value: boolean) => {
    setExpanded(value);
    localStorage.setItem(`ai_assistant_expanded_${pageId}`, String(value));
  };

  const handleCannedPrompt = async (
    prompt:
      | "ver_minhas_solicitacoes"
      | "iniciar_solicitacao"
      | "resumir_politicas"
      | "mostrar_opcoes",
  ) => {
    setMessages((prev) => [...prev, { role: "user", content: prompt }]);
    setLoading(true);
    try {
      const result = await resolveCannedPrompt(prompt, VIEWER_ID, scope);
      const content = Array.isArray(result)
        ? result.length > 0
          ? result
              .map((r: { title?: string; id: string }) => `${r.title || r.id}`)
              .join("\n")
          : "No results found"
        : typeof result === "object" && result !== null && "message" in result
          ? (result as { message: string }).message
          : "Unable to process request";
      setMessages((prev) => [...prev, { role: "assistant", content }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error processing your request" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: input }]);
    setInput("");
    setLoading(true);
    try {
      const result = await resolveCannedPrompt(
        "mostrar_opcoes",
        VIEWER_ID,
        scope,
      );
      const content =
        typeof result === "object" && result !== null && "message" in result
          ? (result as { message: string }).message
          : "Unable to process request";
      setMessages((prev) => [...prev, { role: "assistant", content }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error processing your request" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => handleExpandedChange(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl transition-shadow"
        aria-label={dictionary.interfaces.aiAssistant.title}
      >
        <span className="text-xl">✨</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-96 h-96 rounded-lg bg-white shadow-xl border border-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 p-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <div>
            <h3 className="font-medium text-gray-900">
              {dictionary.interfaces.aiAssistant.title}
            </h3>
            <span className="text-xs text-gray-500">
              {dictionary.interfaces.aiAssistant.betaBadge}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => handleExpandedChange(false)}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {messages.length === 0 ? (
          <div className="flex-1 p-4 overflow-y-auto flex flex-col justify-start">
            <p className="text-sm font-medium text-gray-900 mb-4">
              {dictionary.interfaces.aiAssistant.headline}
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleCannedPrompt("ver_minhas_solicitacoes")}
                className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
              >
                {dictionary.interfaces.aiAssistant.cannedPrompt1}
              </button>
              <button
                type="button"
                onClick={() => handleCannedPrompt("iniciar_solicitacao")}
                className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
              >
                {dictionary.interfaces.aiAssistant.cannedPrompt2}
              </button>
              <button
                type="button"
                onClick={() => handleCannedPrompt("resumir_politicas")}
                className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
              >
                {dictionary.interfaces.aiAssistant.cannedPrompt3}
              </button>
              <button
                type="button"
                onClick={() => handleCannedPrompt("mostrar_opcoes")}
                className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
              >
                {dictionary.interfaces.aiAssistant.cannedPrompt4}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={`${msg.role}-${msg.content}`}
                className={`text-sm ${
                  msg.role === "user"
                    ? "ml-auto max-w-[80%] bg-blue-100 text-blue-900 rounded-lg px-3 py-2"
                    : "mr-auto max-w-[80%] bg-gray-100 text-gray-900 rounded-lg px-3 py-2"
                }`}
              >
                {msg.content}
              </div>
            ))}
            {loading && (
              <div className="mr-auto text-sm text-gray-500">
                {dictionary.interfaces.aiAssistant.title} is thinking...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 p-4 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            placeholder={dictionary.interfaces.aiAssistant.inputPlaceholder}
            disabled={loading}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-gray-50"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !input.trim()}
            className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {dictionary.interfaces.aiAssistant.send}
          </button>
        </div>
        <div className="space-y-1 text-xs text-gray-500">
          <p>{dictionary.interfaces.aiAssistant.disclaimer}</p>
          <button
            type="button"
            className="text-purple-600 hover:underline bg-transparent border-0 p-0"
          >
            {dictionary.interfaces.aiAssistant.feedbackLink}
          </button>
        </div>
      </div>
    </div>
  );
}
