"use client";

import type { Dictionary } from "@/lib/i18n/dictionaries";
import type {
  DataTableConfig,
  FormLinkConfig,
  InterfaceElementType,
  InterfacePage,
  InterfacePageElement,
  VisibilityCondition,
} from "@/lib/interfaces";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export interface CatalogEntry {
  id: string;
  name: string;
  sourceType: "pipe" | "database";
}

interface PaletteItem {
  type: InterfaceElementType;
  label: string;
  badge?: string;
}

function usePaletteGroups(dictionary: Dictionary) {
  const groups: { heading: string; items: PaletteItem[] }[] = [
    {
      heading: dictionary.interfaces.paletteMainHeading,
      items: [
        { type: "data_table", label: dictionary.interfaces.paletteData },
        {
          type: "form_link",
          label: dictionary.interfaces.paletteForm,
          badge: dictionary.interfaces.paletteAiBadge,
        },
        {
          type: "document",
          label: dictionary.interfaces.paletteDocument,
          badge: dictionary.interfaces.paletteNewBadge,
        },
      ],
    },
    {
      heading: dictionary.interfaces.paletteLayoutHeading,
      items: [
        { type: "text", label: dictionary.interfaces.paletteText },
        { type: "link", label: dictionary.interfaces.paletteLink },
        { type: "divider", label: dictionary.interfaces.paletteDivider },
      ],
    },
    {
      heading: dictionary.interfaces.paletteMediaHeading,
      items: [
        { type: "image", label: dictionary.interfaces.paletteImage },
        { type: "video", label: dictionary.interfaces.paletteVideo },
        { type: "embed", label: dictionary.interfaces.paletteEmbed },
      ],
    },
  ];
  return groups;
}

function DataTableElementPreview({
  interfaceId,
  pageId,
  element,
  dictionary,
}: {
  interfaceId: string;
  pageId: string;
  element: InterfacePageElement;
  dictionary: Dictionary;
}) {
  const config = element.config as unknown as DataTableConfig;
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<{ id: string; title: string }[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!config.sourceId) {
      setLoading(false);
      setRows([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    fetch(
      `/api/interfaces/${interfaceId}/pages/${pageId}/elements/${element.id}/data?viewerId=builder`,
    )
      .then((res) => res.json())
      .then((data) => {
        setRows(data.rows ?? []);
        setTotal(data.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [interfaceId, pageId, element.id, config.sourceId]);

  return (
    <div
      data-testid="canvas-data-table"
      data-element-id={element.id}
      className="rounded-md border border-gray-200 bg-white p-3"
    >
      {config.showTitle !== false && (
        <p className="mb-2 text-sm font-semibold text-gray-900">
          {config.titleOverride || dictionary.interfaces.paletteData}
        </p>
      )}
      {!config.sourceId ? (
        <p className="text-xs text-gray-400">
          {dictionary.interfaces.dataWidget.selectSourceLabel}
        </p>
      ) : loading ? (
        <div className="h-6 animate-pulse rounded bg-gray-100" />
      ) : rows.length === 0 ? (
        <p className="text-xs text-gray-400">
          {dictionary.interfaces.dataWidget.emptyState}
        </p>
      ) : (
        <div>
          <ul className="divide-y divide-gray-100">
            {rows.map((row) => (
              <li key={row.id} className="py-1.5 text-sm text-gray-700">
                {row.title || row.id}
              </li>
            ))}
          </ul>
          <p
            data-testid="canvas-data-table-count"
            className="mt-2 text-xs text-gray-500"
          >
            {total === 1
              ? dictionary.interfaces.dataWidget.recordsCountOne.replace(
                  "{n}",
                  String(total),
                )
              : dictionary.interfaces.dataWidget.recordsCountOther.replace(
                  "{n}",
                  String(total),
                )}
          </p>
        </div>
      )}
    </div>
  );
}

function FormLinkElementPreview({
  element,
  catalog,
  dictionary,
}: {
  element: InterfacePageElement;
  catalog: CatalogEntry[];
  dictionary: Dictionary;
}) {
  const config = element.config as unknown as FormLinkConfig;
  const source = catalog.find((c) => c.id === config.sourceId);
  return (
    <div
      data-testid="canvas-form-link"
      data-element-id={element.id}
      className="flex items-center gap-2 rounded-md border border-gray-200 bg-white p-3"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded bg-blue-100 text-blue-700">
        ⧉
      </span>
      <p className="text-sm font-medium text-gray-900">
        {config.nameOverride ||
          source?.name ||
          dictionary.interfaces.formWidget.selectSourceLabel}
      </p>
    </div>
  );
}

function GenericElementPreview({
  element,
  dictionary,
}: {
  element: InterfacePageElement;
  dictionary: Dictionary;
}) {
  const labelKey: Record<string, keyof Dictionary["interfaces"]> = {
    document: "paletteDocument",
    text: "paletteText",
    link: "paletteLink",
    divider: "paletteDivider",
    image: "paletteImage",
    video: "paletteVideo",
    embed: "paletteEmbed",
  };
  const key = labelKey[element.type];
  const label = key ? String(dictionary.interfaces[key]) : element.type;
  return (
    <div
      data-testid="canvas-generic-element"
      data-element-id={element.id}
      data-element-type={element.type}
      className="rounded-md border border-dashed border-gray-300 bg-white p-3 text-sm text-gray-500"
    >
      {label}
    </div>
  );
}

export function InterfaceBuilder({
  interfaceId,
  page,
  pages: initialPages,
  elements: initialElements,
  catalog,
  dictionary,
}: {
  interfaceId: string;
  page: InterfacePage;
  pages: InterfacePage[];
  elements: InterfacePageElement[];
  catalog: CatalogEntry[];
  dictionary: Dictionary;
}) {
  const router = useRouter();
  const paletteGroups = usePaletteGroups(dictionary);

  const [pages, setPages] = useState(initialPages);
  const [elements, setElements] = useState(initialElements);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<"palette" | "editPage">("palette");
  const [draggedType, setDraggedType] = useState<InterfaceElementType | null>(
    null,
  );
  const [autosaveState, setAutosaveState] = useState<"idle" | "saved">("idle");

  useEffect(() => {
    if (autosaveState !== "saved") return;
    const timeout = setTimeout(() => setAutosaveState("idle"), 3000);
    return () => clearTimeout(timeout);
  }, [autosaveState]);

  const selected = elements.find((e) => e.id === selectedId) ?? null;

  async function handleDrop() {
    if (!draggedType) return;
    const type = draggedType;
    setDraggedType(null);

    const response = await fetch(
      `/api/interfaces/${interfaceId}/pages/${page.id}/elements`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, config: {} }),
      },
    );
    if (!response.ok) return;
    const { element } = await response.json();
    setElements((prev) => [...prev, element]);
    setSelectedId(element.id);
    setAutosaveState("saved");
  }

  async function handleConfigChange(
    elementId: string,
    config: Record<string, unknown>,
  ) {
    setElements((prev) =>
      prev.map((e) => (e.id === elementId ? { ...e, config } : e)),
    );
    const response = await fetch(
      `/api/interfaces/${interfaceId}/pages/${page.id}/elements/${elementId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      },
    );
    if (response.ok) {
      setAutosaveState("saved");
    }
  }

  async function handleAddPage() {
    const response = await fetch(`/api/interfaces/${interfaceId}/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: dictionary.interfaces.defaultPageName }),
    });
    if (!response.ok) return;
    const { page: newPage } = await response.json();
    setPages((prev) => [...prev, newPage]);
    router.push(`/interfaces/${interfaceId}/pages/${newPage.id}/edit`);
  }

  async function handlePageUpdate(input: {
    name?: string;
    showHeader?: boolean;
  }) {
    setPages((prev) =>
      prev.map((p) => (p.id === page.id ? { ...p, ...input } : p)),
    );
    const response = await fetch(
      `/api/interfaces/${interfaceId}/pages/${page.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    if (response.ok) {
      setAutosaveState("saved");
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/interfaces"
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            ←
          </Link>
          <span
            data-testid="builder-autosave-state"
            className="text-xs text-gray-400"
          >
            {autosaveState === "saved"
              ? dictionary.interfaces.autosaveSaved
              : dictionary.interfaces.autosaveIdle}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-400"
          >
            {dictionary.interfaces.share}
          </button>
          <Link
            href={`/interfaces/${interfaceId}/pages/${page.id}`}
            data-testid="view-live-link"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            {dictionary.interfaces.viewLive}
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          data-testid="builder-pages-sidebar"
          className="w-56 shrink-0 overflow-y-auto border-r border-gray-200 bg-white p-3"
        >
          <p className="mb-2 text-xs font-semibold text-gray-500">
            {dictionary.interfaces.managePagesHeading}
          </p>
          <div className="space-y-1">
            {pages.map((p) => (
              <Link
                key={p.id}
                href={`/interfaces/${interfaceId}/pages/${p.id}/edit`}
                data-testid="builder-page-tab"
                className={`block truncate rounded-md px-2 py-1.5 text-sm ${
                  p.id === page.id
                    ? "bg-blue-50 font-medium text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {p.name}
              </Link>
            ))}
          </div>
          <button
            type="button"
            data-testid="add-page-button"
            onClick={handleAddPage}
            className="mt-3 w-full rounded-md border border-dashed border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-500 hover:border-gray-400"
          >
            {dictionary.interfaces.addPage}
          </button>
        </aside>

        <main
          data-testid="builder-canvas"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
          className="flex-1 overflow-y-auto bg-[#F5F6F8] p-6"
        >
          {elements.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-gray-300 text-center text-sm text-gray-400">
              {dictionary.interfaces.canvasEmptyState}
            </div>
          ) : (
            <div className="mx-auto max-w-2xl space-y-3">
              {elements.map((element) => (
                <button
                  key={element.id}
                  type="button"
                  data-testid="canvas-element"
                  onClick={() => {
                    setSelectedId(element.id);
                  }}
                  className={`block w-full text-left ${
                    selectedId === element.id
                      ? "rounded-md ring-2 ring-blue-500"
                      : ""
                  }`}
                >
                  {element.type === "data_table" ? (
                    <DataTableElementPreview
                      interfaceId={interfaceId}
                      pageId={page.id}
                      element={element}
                      dictionary={dictionary}
                    />
                  ) : element.type === "form_link" ? (
                    <FormLinkElementPreview
                      element={element}
                      catalog={catalog}
                      dictionary={dictionary}
                    />
                  ) : (
                    <GenericElementPreview
                      element={element}
                      dictionary={dictionary}
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </main>

        <aside
          data-testid="builder-right-panel"
          className="w-80 shrink-0 overflow-y-auto border-l border-gray-200 bg-white p-4"
        >
          {selected ? (
            <ElementConfigPanel
              key={selected.id}
              interfaceId={interfaceId}
              pageId={page.id}
              element={selected}
              catalog={catalog}
              dictionary={dictionary}
              onChange={(config) => handleConfigChange(selected.id, config)}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <div>
              <div className="mb-4 flex gap-4 border-b border-gray-200 text-sm">
                <button
                  type="button"
                  data-testid="right-tab-palette"
                  onClick={() => setRightTab("palette")}
                  className={`-mb-px border-b-2 px-1 pb-2 font-medium ${
                    rightTab === "palette"
                      ? "border-blue-600 text-blue-700"
                      : "border-transparent text-gray-500"
                  }`}
                >
                  {dictionary.interfaces.addElementsTab}
                </button>
                <button
                  type="button"
                  data-testid="right-tab-edit-page"
                  onClick={() => setRightTab("editPage")}
                  className={`-mb-px border-b-2 px-1 pb-2 font-medium ${
                    rightTab === "editPage"
                      ? "border-blue-600 text-blue-700"
                      : "border-transparent text-gray-500"
                  }`}
                >
                  {dictionary.interfaces.editPageTab}
                </button>
              </div>

              {rightTab === "palette" ? (
                <div className="space-y-5">
                  {paletteGroups.map((group) => (
                    <div key={group.heading}>
                      <p className="mb-2 text-xs font-semibold text-gray-500">
                        {group.heading}
                      </p>
                      <div className="space-y-1.5">
                        {group.items.map((item) => (
                          <div
                            key={item.type}
                            draggable
                            data-testid="palette-item"
                            data-element-type={item.type}
                            onDragStart={() => setDraggedType(item.type)}
                            className="flex cursor-grab items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:border-gray-300"
                          >
                            <span>{item.label}</span>
                            {item.badge && (
                              <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700">
                                {item.badge}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label
                      className="mb-1 block text-xs font-medium text-gray-700"
                      htmlFor="page-name"
                    >
                      {dictionary.interfaces.pageNameLabel}
                    </label>
                    <input
                      id="page-name"
                      data-testid="page-name-input"
                      type="text"
                      value={page.name}
                      onChange={(event) =>
                        handlePageUpdate({ name: event.target.value })
                      }
                      className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      data-testid="show-header-checkbox"
                      checked={page.showHeader}
                      onChange={(event) =>
                        handlePageUpdate({ showHeader: event.target.checked })
                      }
                    />
                    {dictionary.interfaces.showHeaderLabel}
                  </label>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function ElementConfigPanel({
  interfaceId,
  pageId,
  element,
  catalog,
  dictionary,
  onChange,
  onClose,
}: {
  interfaceId: string;
  pageId: string;
  element: InterfacePageElement;
  catalog: CatalogEntry[];
  dictionary: Dictionary;
  onChange: (config: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  if (element.type === "data_table") {
    return (
      <DataTableConfigForm
        element={element}
        catalog={catalog}
        dictionary={dictionary}
        onChange={onChange}
        onClose={onClose}
      />
    );
  }
  if (element.type === "form_link") {
    return (
      <FormLinkConfigForm
        element={element}
        catalog={catalog}
        dictionary={dictionary}
        onChange={onChange}
        onClose={onClose}
      />
    );
  }
  return (
    <div>
      <button
        type="button"
        onClick={onClose}
        data-testid="close-element-config"
        className="mb-3 text-sm text-gray-500 hover:text-gray-800"
      >
        ← {dictionary.interfaces.addElementsTab}
      </button>
      <p className="text-sm text-gray-500">{element.type}</p>
    </div>
  );
}

function DataTableConfigForm({
  element,
  catalog,
  dictionary,
  onChange,
  onClose,
}: {
  element: InterfacePageElement;
  catalog: CatalogEntry[];
  dictionary: Dictionary;
  onChange: (config: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const config = element.config as unknown as DataTableConfig;
  const conditions = config.visibilityConditions ?? [];
  const [confirmingClear, setConfirmingClear] = useState(false);

  function update(partial: Partial<DataTableConfig>) {
    onChange({ ...config, ...partial });
  }

  function addAssignedToViewerPreset() {
    const preset: VisibilityCondition = {
      fieldId: "assignee",
      operator: "eq",
      value: "$CURRENT_USER",
    };
    update({ visibilityConditions: [...conditions, preset] });
  }

  function clearAllConditions() {
    update({ visibilityConditions: [] });
    setConfirmingClear(false);
  }

  return (
    <div data-testid="data-table-config-panel" className="space-y-4">
      <button
        type="button"
        onClick={onClose}
        data-testid="close-element-config"
        className="text-sm text-gray-500 hover:text-gray-800"
      >
        ← {dictionary.interfaces.addElementsTab}
      </button>

      <div>
        <label
          className="mb-1 block text-xs font-medium text-gray-700"
          htmlFor="data-source"
        >
          {dictionary.interfaces.dataWidget.selectSourceLabel}
        </label>
        <select
          id="data-source"
          data-testid="data-source-select"
          value={
            config.sourceId ? `${config.sourceType}:${config.sourceId}` : ""
          }
          onChange={(event) => {
            const [sourceType, sourceId] = event.target.value.split(":");
            const found = catalog.find((c) => c.id === sourceId);
            update({
              sourceType: sourceType as "pipe" | "database",
              sourceId,
              titleOverride: config.titleOverride || found?.name,
            });
          }}
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="" />
          {catalog.map((entry) => (
            <option key={entry.id} value={`${entry.sourceType}:${entry.id}`}>
              {entry.name}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          data-testid="show-title-checkbox"
          checked={config.showTitle !== false}
          onChange={(event) => update({ showTitle: event.target.checked })}
        />
        {dictionary.interfaces.dataWidget.showTitleLabel}
      </label>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          data-testid="clickable-rows-checkbox"
          checked={config.clickableRows ?? false}
          onChange={(event) => update({ clickableRows: event.target.checked })}
        />
        {dictionary.interfaces.dataWidget.clickableRowsLabel}
      </label>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          data-testid="allow-export-checkbox"
          checked={config.allowExport ?? true}
          onChange={(event) => update({ allowExport: event.target.checked })}
        />
        {dictionary.interfaces.dataWidget.allowExportLabel}
      </label>

      <div className="border-t border-gray-100 pt-3">
        <p className="mb-2 text-xs font-medium text-gray-700">
          {dictionary.interfaces.dataWidget.visibilityLabel}
        </p>
        <button
          type="button"
          data-testid="preset-assigned-to-viewer"
          onClick={addAssignedToViewerPreset}
          className="mb-2 block w-full rounded-md border border-gray-200 px-3 py-1.5 text-left text-xs text-gray-700 hover:border-gray-300"
        >
          + {dictionary.interfaces.dataWidget.presetAssignedToViewer}
        </button>
        {conditions.length > 0 && (
          <div
            data-testid="visibility-conditions-badge"
            className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-1.5 text-xs text-gray-600"
          >
            <span>{conditions.length}</span>
            <button
              type="button"
              data-testid="clear-all-conditions"
              onClick={() => setConfirmingClear(true)}
              className="text-red-600 hover:underline"
            >
              {dictionary.interfaces.dataWidget.clearAll}
            </button>
          </div>
        )}
      </div>

      <Dialog.Root
        open={confirmingClear}
        onOpenChange={(open) => !open && setConfirmingClear(false)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/30" />
          <Dialog.Content className="fixed top-1/2 left-1/2 w-96 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-5 shadow-xl">
            <Dialog.Title className="mb-3 text-sm font-semibold text-gray-900">
              {dictionary.interfaces.dataWidget.clearAll}
            </Dialog.Title>
            <p className="text-sm text-gray-600">
              {dictionary.interfaces.dataWidget.clearAllConfirm}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingClear(false)}
                className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
              >
                {dictionary.interfaces.cancel}
              </button>
              <button
                type="button"
                data-testid="confirm-clear-all-conditions"
                onClick={clearAllConditions}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
              >
                {dictionary.interfaces.dataWidget.clearAll}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function FormLinkConfigForm({
  element,
  catalog,
  dictionary,
  onChange,
  onClose,
}: {
  element: InterfacePageElement;
  catalog: CatalogEntry[];
  dictionary: Dictionary;
  onChange: (config: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const config = element.config as unknown as FormLinkConfig;
  const pipeCatalog = catalog.filter((c) => c.sourceType === "pipe");

  function update(partial: Partial<FormLinkConfig>) {
    onChange({ ...config, ...partial });
  }

  return (
    <div data-testid="form-link-config-panel" className="space-y-4">
      <button
        type="button"
        onClick={onClose}
        data-testid="close-element-config"
        className="text-sm text-gray-500 hover:text-gray-800"
      >
        ← {dictionary.interfaces.addElementsTab}
      </button>

      <div>
        <label
          className="mb-1 block text-xs font-medium text-gray-700"
          htmlFor="form-source"
        >
          {dictionary.interfaces.formWidget.selectSourceLabel}
        </label>
        <select
          id="form-source"
          data-testid="form-source-select"
          value={config.sourceId ?? ""}
          onChange={(event) => {
            const found = pipeCatalog.find((c) => c.id === event.target.value);
            update({
              sourceType: "pipe",
              sourceId: event.target.value,
              nameOverride: config.nameOverride || found?.name,
            });
          }}
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="" />
          {pipeCatalog.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          className="mb-1 block text-xs font-medium text-gray-700"
          htmlFor="form-name-override"
        >
          {dictionary.interfaces.formWidget.nameOverrideLabel}
        </label>
        <input
          id="form-name-override"
          data-testid="form-name-override-input"
          type="text"
          value={config.nameOverride ?? ""}
          onChange={(event) => update({ nameOverride: event.target.value })}
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}
