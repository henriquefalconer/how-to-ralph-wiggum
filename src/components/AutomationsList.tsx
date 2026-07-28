"use client";

import type {
  Automation,
  AutomationActionType,
  AutomationTriggerType,
} from "@/lib/automations";
import type { Dictionary } from "@/lib/i18n";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Switch from "@radix-ui/react-switch";
import Link from "next/link";
import { useMemo, useState } from "react";

type SortBy = "name" | "recent";

export function AutomationsList({
  pipeId,
  automations,
  dictionary,
}: {
  pipeId: string;
  automations: Automation[];
  dictionary: Dictionary;
}) {
  const d = dictionary.automations;
  const [list, setList] = useState(automations);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [onlyEnabled, setOnlyEnabled] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const visible = useMemo(() => {
    let rows = list;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((a) => a.name.toLowerCase().includes(q));
    }
    if (onlyEnabled) {
      rows = rows.filter((a) => a.enabled);
    }
    rows = [...rows].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return rows;
  }, [list, search, onlyEnabled, sortBy]);

  async function toggleEnabled(automation: Automation) {
    const nextEnabled = !automation.enabled;
    setList((prev) =>
      prev.map((a) =>
        a.id === automation.id ? { ...a, enabled: nextEnabled } : a,
      ),
    );
    await fetch(`/api/automations/${automation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: nextEnabled }),
    });
  }

  async function handleDuplicate(automation: Automation) {
    const response = await fetch(
      `/api/automations/${automation.id}/duplicate`,
      {
        method: "POST",
      },
    );
    const body = await response.json();
    if (response.ok) {
      setList((prev) => [body.automation, ...prev]);
    }
  }

  async function handleDelete() {
    if (!deleteTargetId) return;
    await fetch(`/api/automations/${deleteTargetId}`, { method: "DELETE" });
    setList((prev) => prev.filter((a) => a.id !== deleteTargetId));
    setDeleteTargetId(null);
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">{d.heading}</h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/pipes/${pipeId}/automations/logs`}
            data-testid="automation-logs-link"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {d.logs.heading}
          </Link>
          <Link
            href={`/pipes/${pipeId}/automations/new`}
            data-testid="new-automation-link"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            {d.newAutomation}
          </Link>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <input
          data-testid="automations-search"
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={d.searchPlaceholder}
          className="w-64 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
        <button
          type="button"
          data-testid="automations-filters-button"
          onClick={() => setOnlyEnabled((prev) => !prev)}
          aria-pressed={onlyEnabled}
          className={`rounded-md border px-3 py-1.5 text-sm ${
            onlyEnabled
              ? "border-blue-500 bg-blue-50 text-blue-700"
              : "border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          {d.filters}
        </button>
        <select
          data-testid="automations-sort-select"
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as SortBy)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700"
        >
          <option value="recent">{d.sortByRecent}</option>
          <option value="name">{d.sortByName}</option>
        </select>
      </div>

      {visible.length === 0 ? (
        <div
          data-testid="automations-empty-state"
          className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white py-16"
        >
          <div className="mb-3 flex gap-2 text-4xl">
            <span>⚡</span>
            <span>🔗</span>
          </div>
          <p className="mb-4 text-sm text-gray-600">{d.emptyStateTitle}</p>
          <Link
            href={`/pipes/${pipeId}/automations/new`}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            {d.emptyStateCta}
          </Link>
        </div>
      ) : (
        <ul className="space-y-2" data-testid="automations-list">
          {visible.map((automation) => (
            <li
              key={automation.id}
              data-testid="automation-row"
              data-automation-id={automation.id}
              className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {automation.name}
                </p>
                <p className="text-xs text-gray-500">
                  {
                    d.builder.triggers[
                      automation.triggerType as AutomationTriggerType
                    ]
                  }{" "}
                  →{" "}
                  {
                    d.builder.actions[
                      automation.actionType as AutomationActionType
                    ]
                  }
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Switch.Root
                  checked={automation.enabled}
                  onCheckedChange={() => toggleEnabled(automation)}
                  data-testid="automation-enabled-toggle"
                  className="relative h-5 w-9 rounded-full bg-gray-300 data-[state=checked]:bg-blue-600"
                >
                  <Switch.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-4" />
                </Switch.Root>

                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      type="button"
                      data-testid="automation-kebab"
                      className="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100"
                    >
                      ⋮
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content className="min-w-[140px] rounded-md border border-gray-200 bg-white p-1 shadow-lg">
                      <DropdownMenu.Item asChild>
                        <Link
                          href={`/pipes/${pipeId}/automations/${automation.id}/edit`}
                          data-testid="automation-edit"
                          className="block cursor-pointer rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          {d.edit}
                        </Link>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        data-testid="automation-duplicate"
                        onSelect={() => handleDuplicate(automation)}
                        className="cursor-pointer rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        {d.duplicate}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        data-testid="automation-delete"
                        onSelect={() => setDeleteTargetId(automation.id)}
                        className="cursor-pointer rounded px-2 py-1.5 text-sm text-red-600 hover:bg-red-50"
                      >
                        {d.delete}
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link
        href={`/pipes/${pipeId}`}
        className="mt-6 inline-block text-sm text-blue-600 hover:underline"
      >
        ← {d.backToBoard}
      </Link>

      <Dialog.Root
        open={deleteTargetId !== null}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/30" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-96 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-5 shadow-xl">
            <Dialog.Title className="mb-3 text-sm font-semibold text-gray-900">
              {d.delete}
            </Dialog.Title>
            <p className="text-sm text-gray-600">{d.deleteConfirm}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
              >
                {d.builder.cancel}
              </button>
              <button
                type="button"
                data-testid="confirm-delete-automation"
                onClick={handleDelete}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
              >
                {d.delete}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
