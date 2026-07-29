"use client";

import type { Dictionary } from "@/lib/i18n/dictionaries";
import { formatCardsCount } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import type { PipeSummary } from "@/lib/pipes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreatePipeModal } from "./CreatePipeModal";

export function PipesSection({
  pipes,
  dictionary,
  locale,
}: {
  pipes: PipeSummary[];
  dictionary: Dictionary;
  locale: Locale;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();

  return (
    <section>
      <h2 className="mb-4 text-sm font-semibold text-gray-900">
        {dictionary.home.pipesTab}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          data-testid="create-pipe-tile"
          className="flex h-28 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white text-gray-500 hover:border-gray-400 hover:text-gray-700"
        >
          <span className="text-2xl leading-none">+</span>
          <span className="text-sm font-medium">
            {dictionary.home.createPipeTile}
          </span>
        </button>
        {pipes.map((pipe) => (
          <Link
            key={pipe.id}
            href={`/pipes/${pipe.id}`}
            data-testid="pipe-card"
            className="flex h-28 flex-col justify-between rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300"
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-md text-white"
              style={{ backgroundColor: pipe.color }}
            >
              ▦
            </span>
            <div>
              <p className="truncate text-sm font-semibold text-gray-900">
                {pipe.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatCardsCount(dictionary, pipe.cardsCount, pipe.itemName)}
              </p>
            </div>
          </Link>
        ))}
      </div>
      {modalOpen && (
        <CreatePipeModal
          dictionary={dictionary}
          locale={locale}
          onClose={() => setModalOpen(false)}
          onCreated={(id) => router.push(`/pipes/${id}`)}
        />
      )}
    </section>
  );
}
