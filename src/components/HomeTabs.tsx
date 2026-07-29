"use client";

import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locales";
import type { PipeSummary } from "@/lib/pipes";
import type { TableSummary } from "@/lib/tables";
import { useState } from "react";
import { DatabasesSection } from "./DatabasesSection";
import { PipesSection } from "./PipesSection";

export function HomeTabs({
  pipes,
  tables,
  dictionary,
  locale,
}: {
  pipes: PipeSummary[];
  tables: TableSummary[];
  dictionary: Dictionary;
  locale: Locale;
}) {
  const [tab, setTab] = useState<"pipes" | "databases">("pipes");

  return (
    <div>
      <div className="mb-6 flex gap-1 border-b border-gray-200">
        <button
          type="button"
          data-testid="home-tab-pipes"
          onClick={() => setTab("pipes")}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${
            tab === "pipes"
              ? "border-gray-900 text-gray-900"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {dictionary.home.pipesTab}
        </button>
        <button
          type="button"
          data-testid="home-tab-databases"
          onClick={() => setTab("databases")}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${
            tab === "databases"
              ? "border-gray-900 text-gray-900"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {dictionary.home.databasesTab}
        </button>
      </div>
      {tab === "pipes" ? (
        <PipesSection pipes={pipes} dictionary={dictionary} locale={locale} />
      ) : (
        <DatabasesSection tables={tables} dictionary={dictionary} />
      )}
    </div>
  );
}
