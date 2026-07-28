"use client";

import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/locales";
import * as Dialog from "@radix-ui/react-dialog";
import { type FormEvent, useState } from "react";

export function CreatePipeModal({
  dictionary,
  locale,
  onClose,
  onCreated,
}: {
  dictionary: Dictionary;
  locale: Locale;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [step, setStep] = useState<"gallery" | "name">("gallery");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/pipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, locale }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to create pipe");
      }
      const { pipe } = await response.json();
      onCreated(pipe.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create pipe");
      setSubmitting(false);
    }
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content
          data-testid="create-pipe-modal"
          className="fixed top-1/2 left-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl"
        >
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              {dictionary.createPipe.title}
            </Dialog.Title>
            <Dialog.Close
              aria-label={dictionary.createPipe.close}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </Dialog.Close>
          </div>

          {step === "gallery" ? (
            <div className="space-y-4">
              <input
                type="text"
                placeholder={dictionary.createPipe.searchPlaceholder}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                disabled
              />
              <p className="text-sm font-medium text-gray-700">
                {dictionary.createPipe.templatesHeading}
              </p>
              <div className="flex justify-between gap-2 pt-2">
                <button
                  type="button"
                  disabled
                  title={dictionary.createPipe.createWithAi}
                  className="flex-1 cursor-not-allowed rounded-md bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2 text-sm font-medium text-white opacity-50"
                >
                  {dictionary.createPipe.createWithAi}
                </button>
                <button
                  type="button"
                  data-testid="create-from-scratch"
                  onClick={() => setStep("name")}
                  className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  {dictionary.createPipe.createFromScratch}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <label
                className="block text-sm font-medium text-gray-700"
                htmlFor="pipe-name"
              >
                {dictionary.createPipe.nameLabel}
              </label>
              <input
                id="pipe-name"
                data-testid="pipe-name-input"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={dictionary.createPipe.namePlaceholder}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                // biome-ignore lint/a11y/noAutofocus: modal-step transition, matches target product's focus behavior
                autoFocus
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  {dictionary.createPipe.cancel}
                </button>
                <button
                  type="submit"
                  data-testid="submit-create-pipe"
                  disabled={!name.trim() || submitting}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {dictionary.createPipe.submit}
                </button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
