"use client";

import type { Dictionary } from "@/lib/i18n";
import type {
  DataTableConfig,
  FormLinkConfig,
  FormLinkTarget,
  InterfacePageElement,
} from "@/lib/interfaces";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CreateCardPopover } from "./CreateCardPopover";

const VIEWER_ID = "anonymous";

function LiveDataTable({
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
      return;
    }
    setLoading(true);
    fetch(
      `/api/interfaces/${interfaceId}/pages/${pageId}/elements/${element.id}/data?viewerId=${VIEWER_ID}`,
    )
      .then((res) => res.json())
      .then((data) => {
        setRows(data.rows ?? []);
        setTotal(data.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [interfaceId, pageId, element.id, config.sourceId]);

  if (!config.sourceId) return null;

  return (
    <div
      data-testid="live-data-table"
      data-element-id={element.id}
      className="rounded-lg border border-gray-200 bg-white p-4"
    >
      {config.showTitle !== false && (
        <p className="mb-3 text-base font-semibold text-gray-900">
          {config.titleOverride || dictionary.interfaces.paletteData}
        </p>
      )}
      {loading ? (
        <div className="h-6 animate-pulse rounded bg-gray-100" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-400">
          {dictionary.interfaces.dataWidget.emptyState}
        </p>
      ) : (
        <div>
          <ul className="divide-y divide-gray-100">
            {rows.map((row) =>
              config.clickableRows && config.sourceType === "pipe" ? (
                <li key={row.id}>
                  <Link
                    href={`/open-cards/${row.id}`}
                    data-testid="live-data-table-row"
                    className="block py-2 text-sm text-blue-700 hover:underline"
                  >
                    {row.title || row.id}
                  </Link>
                </li>
              ) : (
                <li
                  key={row.id}
                  data-testid="live-data-table-row"
                  className="py-2 text-sm text-gray-700"
                >
                  {row.title || row.id}
                </li>
              ),
            )}
          </ul>
          <p
            data-testid="live-data-table-count"
            className="mt-3 text-xs text-gray-500"
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

function LiveFormLink({
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
  const config = element.config as unknown as FormLinkConfig;
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<FormLinkTarget | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleOpen() {
    if (!config.sourceId) return;
    setOpen(true);
    setSuccess(false);
    const response = await fetch(
      `/api/interfaces/${interfaceId}/pages/${pageId}/elements/${element.id}/form-target`,
    );
    if (response.ok) {
      const data = await response.json();
      setTarget(data.target);
    }
  }

  async function handleSubmit(values: Record<string, string>) {
    if (!target) return "Form not ready";
    setSubmitting(true);
    try {
      const response = await fetch(`/api/pipes/${target.pipeId}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phaseId: target.phaseId, values }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        return body.error ?? "Failed to create card";
      }
      setSuccess(true);
      setSubmitting(false);
      return undefined;
    } catch (err) {
      setSubmitting(false);
      return err instanceof Error ? err.message : "Failed to create card";
    }
  }

  if (!config.sourceId) return null;

  return (
    <>
      <button
        type="button"
        data-testid="live-form-link"
        data-element-id={element.id}
        onClick={handleOpen}
        className="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 text-left hover:border-gray-300"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded bg-blue-100 text-blue-700">
          ⧉
        </span>
        <span className="text-sm font-medium text-gray-900">
          {config.nameOverride || dictionary.interfaces.formWidget.openForm}
        </span>
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40" />
          <Dialog.Content
            data-testid="live-form-modal"
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            {success ? (
              <div className="w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-xl">
                <p
                  data-testid="live-form-success"
                  className="text-sm text-green-700"
                >
                  {dictionary.interfaces.formWidget.submitSuccess}
                </p>
              </div>
            ) : target ? (
              <CreateCardPopover
                fields={target.fields}
                dictionary={dictionary}
                submitting={submitting}
                onCancel={() => setOpen(false)}
                onSubmit={handleSubmit}
              />
            ) : (
              <div className="w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-xl">
                <div className="h-6 animate-pulse rounded bg-gray-100" />
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function LiveGenericElement({ element }: { element: InterfacePageElement }) {
  const config = element.config as Record<string, string | undefined>;
  switch (element.type) {
    case "text":
      return config.content ? (
        <p className="text-sm text-gray-700">{config.content}</p>
      ) : null;
    case "link":
      return config.url ? (
        <a href={config.url} className="text-sm text-blue-700 hover:underline">
          {config.label || config.url}
        </a>
      ) : null;
    case "divider":
      return <hr className="border-gray-200" />;
    case "image":
      return config.url ? (
        <img src={config.url} alt="" className="max-w-full rounded-md" />
      ) : null;
    case "video":
      return config.url ? (
        <video src={config.url} controls className="max-w-full rounded-md">
          <track kind="captions" />
        </video>
      ) : null;
    case "embed":
      return config.url ? (
        <iframe
          src={config.url}
          title="embed"
          className="h-64 w-full rounded-md border border-gray-200"
        />
      ) : null;
    default:
      return null;
  }
}

export function InterfaceLiveView({
  interfaceId,
  pageId,
  elements,
  dictionary,
}: {
  interfaceId: string;
  pageId: string;
  elements: InterfacePageElement[];
  dictionary: Dictionary;
}) {
  return (
    <div
      data-testid="interface-live-view"
      className="mx-auto max-w-2xl space-y-3 p-6"
    >
      {elements.map((element) => (
        <div key={element.id}>
          {element.type === "data_table" ? (
            <LiveDataTable
              interfaceId={interfaceId}
              pageId={pageId}
              element={element}
              dictionary={dictionary}
            />
          ) : element.type === "form_link" ? (
            <LiveFormLink
              interfaceId={interfaceId}
              pageId={pageId}
              element={element}
              dictionary={dictionary}
            />
          ) : (
            <LiveGenericElement element={element} />
          )}
        </div>
      ))}
    </div>
  );
}
