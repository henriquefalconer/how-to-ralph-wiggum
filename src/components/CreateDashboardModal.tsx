"use client";

import type { Dictionary } from "@/lib/i18n";
import * as Dialog from "@radix-ui/react-dialog";
import { type FormEvent, useState } from "react";

export function CreateDashboardModal({
  pipeId,
  dictionary,
  onClose,
  onCreated,
}: {
  pipeId: string;
  dictionary: Dictionary;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const d = dictionary.dashboards;
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
      const response = await fetch(`/api/pipes/${pipeId}/dashboards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to create dashboard");
      }
      const { dashboard } = await response.json();
      onCreated(dashboard.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create dashboard",
      );
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
          data-testid="create-dashboard-modal"
          className="fixed top-1/2 left-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl"
        >
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              {d.createModalTitle}
            </Dialog.Title>
            <Dialog.Close
              aria-label={d.cancel}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </Dialog.Close>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label
              className="block text-sm font-medium text-gray-700"
              htmlFor="dashboard-name"
            >
              {d.nameLabel}
            </label>
            <input
              id="dashboard-name"
              data-testid="dashboard-name-input"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={d.namePlaceholder}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              // biome-ignore lint/a11y/noAutofocus: matches the target product's create-modal focus behavior
              autoFocus
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                {d.cancel}
              </button>
              <button
                type="submit"
                data-testid="submit-create-dashboard"
                disabled={!name.trim() || submitting}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {d.submit}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
