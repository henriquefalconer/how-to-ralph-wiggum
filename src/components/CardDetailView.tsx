"use client";

import type { CardDetail } from "@/lib/cards";
import { evaluateConditionals } from "@/lib/field-conditional-types";
import { isFieldValueEditable } from "@/lib/field-types";
import type { Dictionary } from "@/lib/i18n";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export function CardDetailView({
  pipeId,
  detail,
  dictionary,
}: {
  pipeId: string;
  detail: CardDetail;
  dictionary: Dictionary;
}) {
  const router = useRouter();
  const [phaseValues, setPhaseValues] = useState<Record<string, string>>(
    Object.fromEntries(detail.phaseFields.map((f) => [f.field.id, f.value])),
  );
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  const fieldActions = useMemo(
    () => evaluateConditionals(detail.phaseFieldConditionals, phaseValues),
    [detail.phaseFieldConditionals, phaseValues],
  );

  function phaseName(phaseId: string): string {
    return detail.pipePhases.find((p) => p.id === phaseId)?.name ?? "";
  }

  async function handleFieldBlur(fieldId: string) {
    await fetch(`/api/cards/${detail.card.id}/field-values`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fieldId, value: phaseValues[fieldId] ?? "" }),
    });
  }

  async function handleMove() {
    if (!detail.nextPhase) return;
    setMoving(true);
    setMoveError(null);
    try {
      const response = await fetch(`/api/cards/${detail.card.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toPhaseId: detail.nextPhase.id }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to move card");
      }
      router.refresh();
    } catch (err) {
      setMoveError(err instanceof Error ? err.message : "Failed to move card");
    } finally {
      setMoving(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 p-6 md:grid-cols-3">
      <section className="md:col-span-1">
        <h1
          data-testid="card-title"
          className={`text-xl font-semibold ${detail.card.done ? "text-gray-400 line-through" : "text-gray-900"}`}
        >
          {detail.card.done && <span className="mr-1">✓</span>}
          {detail.card.title}
        </h1>

        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">
            {dictionary.card.detail.startFormHeading}
          </h2>
          <ul data-testid="start-form-values" className="space-y-2">
            {detail.startForm.map((entry) => (
              <li key={entry.field.id} className="text-sm">
                <span className="block text-xs text-gray-500">
                  {entry.field.label}
                </span>
                <span data-testid="start-form-value" className="text-gray-800">
                  {entry.value || "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">
            {dictionary.card.detail.historyHeading}
          </h2>
          {detail.history.length === 0 ? (
            <p data-testid="history-empty" className="text-xs text-gray-400">
              {dictionary.card.detail.historyEmpty}
            </p>
          ) : (
            <ul data-testid="history-list" className="space-y-1">
              {detail.history.map((entry) => (
                <li key={entry.id} className="text-xs text-gray-600">
                  {dictionary.card.detail.historyEntry.replace(
                    "{phase}",
                    phaseName(entry.toPhaseId),
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <Link
          href={`/pipes/${pipeId}`}
          className="mt-6 inline-block text-sm text-blue-600 hover:underline"
        >
          ← {dictionary.card.detail.backToBoard}
        </Link>
      </section>

      <section className="md:col-span-2">
        <div className="mb-4 flex items-center justify-between">
          <span
            data-testid="current-phase-badge"
            className="rounded-full bg-teal-100 px-3 py-1 text-xs font-medium text-teal-800"
          >
            {dictionary.card.detail.currentPhaseHeading}: {detail.phase.name}
          </span>
          {detail.nextPhase && (
            <button
              type="button"
              data-testid="move-card-button"
              disabled={moving}
              onClick={handleMove}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {dictionary.card.detail.moveButton.replace(
                "{phase}",
                detail.nextPhase.name,
              )}
            </button>
          )}
        </div>
        {moveError && <p className="mb-2 text-sm text-red-600">{moveError}</p>}

        {(() => {
          const visibleFields = detail.phaseFields.filter(
            ({ field }) => fieldActions[field.id] !== "hide",
          );
          return visibleFields.length === 0 ? (
            <p
              data-testid="phase-fields-empty"
              className="text-sm text-gray-400"
            >
              {dictionary.card.detail.noPhaseFields}
            </p>
          ) : (
            <div className="space-y-3">
              {visibleFields.map(({ field }) => (
                <div
                  key={field.id}
                  data-testid="phase-field-row"
                  data-field-id={field.id}
                >
                  <label
                    className="mb-1 block text-xs font-medium text-gray-700"
                    htmlFor={`phase-field-${field.id}`}
                  >
                    {field.label}
                  </label>
                  <input
                    id={`phase-field-${field.id}`}
                    data-testid="phase-field-input"
                    type="text"
                    disabled={!isFieldValueEditable(field)}
                    value={phaseValues[field.id] ?? ""}
                    onChange={(event) =>
                      setPhaseValues((prev) => ({
                        ...prev,
                        [field.id]: event.target.value,
                      }))
                    }
                    onBlur={() => handleFieldBlur(field.id)}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50"
                  />
                </div>
              ))}
            </div>
          );
        })()}
      </section>
    </div>
  );
}
