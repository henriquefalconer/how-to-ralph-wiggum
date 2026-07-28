"use client";

import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/locales";
import type { Interface } from "@/lib/interfaces";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreateInterfaceModal } from "./CreateInterfaceModal";

export function InterfacesList({
  interfaces,
  dictionary,
  locale,
}: {
  interfaces: (Interface & { firstPageId: string | null })[];
  dictionary: Dictionary;
  locale: Locale;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">
          {dictionary.interfaces.heading}
        </h1>
        <button
          type="button"
          data-testid="create-interface-cta"
          onClick={() => setModalOpen(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {dictionary.interfaces.emptyStateCta}
        </button>
      </div>

      {interfaces.length === 0 ? (
        <div
          data-testid="interfaces-empty-state"
          className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-gray-300 bg-white px-6 py-20 text-center"
        >
          <p className="text-sm text-gray-500">
            {dictionary.interfaces.emptyStateTitle}
          </p>
          <button
            type="button"
            data-testid="create-interface-empty-cta"
            onClick={() => setModalOpen(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {dictionary.interfaces.emptyStateCta}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {interfaces.map((iface) =>
            iface.firstPageId ? (
              <Link
                key={iface.id}
                href={`/interfaces/${iface.id}/pages/${iface.firstPageId}/edit`}
                data-testid="interface-card"
                className="flex h-28 flex-col justify-between rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-gray-900 text-white">
                  ▤
                </span>
                <p className="truncate text-sm font-semibold text-gray-900">
                  {iface.name}
                </p>
              </Link>
            ) : null,
          )}
        </div>
      )}

      {modalOpen && (
        <CreateInterfaceModal
          dictionary={dictionary}
          locale={locale}
          onClose={() => setModalOpen(false)}
          onCreated={(interfaceId, pageId) =>
            router.push(`/interfaces/${interfaceId}/pages/${pageId}/edit`)
          }
        />
      )}
    </section>
  );
}
