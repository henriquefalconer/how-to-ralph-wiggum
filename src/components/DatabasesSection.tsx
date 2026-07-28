"use client";

import type { Dictionary } from "@/lib/i18n";
import { formatRecordsCount } from "@/lib/i18n/format";
import type { TableSummary } from "@/lib/tables";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreateDatabaseModal } from "./CreateDatabaseModal";

export function DatabasesSection({
  tables,
  dictionary,
}: {
  tables: TableSummary[];
  dictionary: Dictionary;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();

  return (
    <section>
      <h2 className="mb-4 text-sm font-semibold text-gray-900">
        {dictionary.home.databasesTab}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          data-testid="create-database-tile"
          className="flex h-28 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white text-gray-500 hover:border-gray-400 hover:text-gray-700"
        >
          <span className="text-2xl leading-none">+</span>
          <span className="text-sm font-medium">
            {dictionary.database.createTile}
          </span>
        </button>
        {tables.map((table) => (
          <Link
            key={table.id}
            href={`/apollo_databases/${table.id}`}
            data-testid="database-card"
            className="flex h-28 flex-col justify-between rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-gray-700 text-white">
              ▤
            </span>
            <div>
              <p className="truncate text-sm font-semibold text-gray-900">
                {table.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatRecordsCount(dictionary, table.recordsCount)}
              </p>
            </div>
          </Link>
        ))}
      </div>
      {modalOpen && (
        <CreateDatabaseModal
          dictionary={dictionary}
          onClose={() => setModalOpen(false)}
          onCreated={(id) => router.push(`/apollo_databases/${id}`)}
        />
      )}
    </section>
  );
}
