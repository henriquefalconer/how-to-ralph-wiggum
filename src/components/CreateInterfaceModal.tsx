"use client";

import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/locales";
import type { InterfacePrivacyTier } from "@/lib/interfaces";
import * as Dialog from "@radix-ui/react-dialog";
import { type FormEvent, useState } from "react";

const ICONS = ["Layout", "Home", "Users", "Briefcase", "FileText", "Star"];

export function CreateInterfaceModal({
  dictionary,
  locale,
  onClose,
  onCreated,
}: {
  dictionary: Dictionary;
  locale: Locale;
  onClose: () => void;
  onCreated: (interfaceId: string, pageId: string) => void;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(ICONS[0]);
  const [privacyTier, setPrivacyTier] =
    useState<InterfacePrivacyTier>("restricted_org");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/interfaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, icon, privacyTier, locale }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to create interface");
      }
      const data = await response.json();
      onCreated(data.interface.id, data.page.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create interface",
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
          data-testid="create-interface-modal"
          className="fixed top-1/2 left-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl"
        >
          <Dialog.Title className="mb-4 text-lg font-semibold text-gray-900">
            {dictionary.interfaces.createModalTitle}
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="mb-1 block text-sm font-medium text-gray-700"
                htmlFor="interface-name"
              >
                {dictionary.interfaces.nameLabel}
              </label>
              <input
                id="interface-name"
                data-testid="interface-name-input"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={dictionary.interfaces.namePlaceholder}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                // biome-ignore lint/a11y/noAutofocus: modal-open focus, matches CreatePipeModal
                autoFocus
              />
            </div>

            <div>
              <label
                className="mb-1 block text-sm font-medium text-gray-700"
                htmlFor="interface-icon"
              >
                {dictionary.interfaces.iconLabel}
              </label>
              <select
                id="interface-icon"
                data-testid="interface-icon-select"
                value={icon}
                onChange={(event) => setIcon(event.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              >
                {ICONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="mb-1 block text-sm font-medium text-gray-700"
                htmlFor="interface-privacy"
              >
                {dictionary.interfaces.privacyLabel}
              </label>
              <select
                id="interface-privacy"
                data-testid="interface-privacy-select"
                value={privacyTier}
                onChange={(event) =>
                  setPrivacyTier(event.target.value as InterfacePrivacyTier)
                }
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="restricted_people">
                  {dictionary.interfaces.privacyRestrictedPeople}
                </option>
                <option value="restricted_org">
                  {dictionary.interfaces.privacyRestrictedOrg.replace(
                    "{org}",
                    "",
                  )}
                </option>
                <option value="public_link">
                  {dictionary.interfaces.privacyPublicLink}
                </option>
              </select>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                {dictionary.interfaces.cancel}
              </button>
              <button
                type="submit"
                data-testid="submit-create-interface"
                disabled={!name.trim() || submitting}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {dictionary.interfaces.submit}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
