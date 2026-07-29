"use client";

import {
  type AuditLogCategory,
  type AuditLogEntryView,
  renderAuditMessage,
} from "@/lib/audit-message";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locales";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const RESOURCE_CHIP_STYLES: Record<string, string> = {
  card: "bg-blue-50 text-blue-700",
  automation: "bg-purple-50 text-purple-700",
  pipe: "bg-emerald-50 text-emerald-700",
  field: "bg-amber-50 text-amber-700",
  phase: "bg-sky-50 text-sky-700",
  table: "bg-gray-100 text-gray-700",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

export function AuditLogModal({
  pipeId,
  entries,
  dictionary,
  locale,
}: {
  pipeId: string;
  entries: AuditLogEntryView[];
  dictionary: Dictionary;
  locale: Locale;
}) {
  const d = dictionary.auditLog;
  const router = useRouter();
  const [tab, setTab] = useState<AuditLogCategory>("card_activity");
  const [author, setAuthor] = useState("");

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "short",
        timeStyle: "short",
      }),
    [locale],
  );

  const visible = useMemo(() => {
    const query = author.trim().toLowerCase();
    return entries.filter((entry) => {
      if (entry.category !== tab) return false;
      if (!query) return true;
      return (
        entry.actorName.toLowerCase().includes(query) ||
        entry.actorEmail.toLowerCase().includes(query)
      );
    });
  }, [entries, tab, author]);

  const exportHref = `/api/pipes/${pipeId}/audit-log?format=csv&category=${tab}&locale=${locale}${
    author.trim() ? `&author=${encodeURIComponent(author.trim())}` : ""
  }`;

  const tabs: { key: AuditLogCategory; label: string }[] = [
    { key: "card_activity", label: d.tabCardActivity },
    { key: "config_change", label: d.tabConfigChange },
  ];

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) router.push(`/pipes/${pipeId}`);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content
          data-testid="audit-log-modal"
          className="fixed left-1/2 top-1/2 flex max-h-[85vh] w-[min(1100px,94vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg bg-white shadow-xl"
        >
          <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
            <div>
              <Dialog.Title
                className="text-lg font-semibold text-gray-900"
                data-testid="audit-log-heading"
              >
                {d.heading}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-gray-500">
                {d.subtitle}
              </Dialog.Description>
            </div>
            <Dialog.Close
              data-testid="audit-log-close"
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label={d.close}
            >
              ✕
            </Dialog.Close>
          </div>

          <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-6">
            <div className="flex gap-4">
              {tabs.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  data-testid={`audit-tab-${item.key}`}
                  onClick={() => setTab(item.key)}
                  className={`border-b-2 px-1 py-3 text-sm font-medium ${
                    tab === item.key
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 py-2">
              <button
                type="button"
                data-testid="audit-log-feedback"
                className="rounded px-2 py-1 text-sm text-blue-600 hover:bg-blue-50"
              >
                {d.sendFeedback}
              </button>
              <a
                href={exportHref}
                data-testid="audit-log-export"
                title={d.exportLogs}
                aria-label={d.exportLogs}
                className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                ⭳
              </a>
              <input
                value={author}
                onChange={(event) => setAuthor(event.target.value)}
                placeholder={d.searchPlaceholder}
                data-testid="audit-log-search"
                className="w-56 rounded border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto px-6 py-4">
            {visible.length === 0 ? (
              <p
                className="py-10 text-center text-sm text-gray-500"
                data-testid="audit-log-empty"
              >
                {d.emptyState}
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                    <th className="py-2 pr-4 font-medium">
                      {d.columnDateTime}
                    </th>
                    <th className="py-2 pr-4 font-medium">{d.columnActor}</th>
                    <th className="py-2 pr-4 font-medium">
                      {d.columnResourceType}
                    </th>
                    <th className="py-2 font-medium">{d.columnDetails}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((entry) => (
                    <tr
                      key={entry.id}
                      data-testid="audit-log-row"
                      className="border-b border-gray-100 align-top"
                    >
                      <td className="whitespace-nowrap py-3 pr-4 text-gray-600">
                        {dateFormatter.format(new Date(entry.occurredAt))}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                            {initials(entry.actorName)}
                          </span>
                          <span>
                            <span
                              className="block text-gray-900"
                              data-testid="audit-log-actor"
                            >
                              {entry.actorName}
                            </span>
                            <span className="block text-xs text-gray-500">
                              {entry.actorEmail}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            RESOURCE_CHIP_STYLES[entry.resourceType] ??
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {d.resourceTypes[entry.resourceType]}
                        </span>
                      </td>
                      <td
                        className="py-3 text-gray-700"
                        data-testid="audit-log-details"
                      >
                        {renderAuditMessage(entry, dictionary)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
