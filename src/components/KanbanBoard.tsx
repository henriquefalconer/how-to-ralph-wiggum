"use client";

import type { Dictionary } from "@/lib/i18n";
import type { Phase } from "@/lib/phases";
import { useState } from "react";

export function KanbanBoard({
  pipeId,
  initialPhases,
  dictionary,
}: {
  pipeId: string;
  initialPhases: Phase[];
  dictionary: Dictionary;
}) {
  const [phaseList, setPhaseList] = useState(initialPhases);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  async function persistOrder(orderedIds: string[]) {
    const response = await fetch(`/api/pipes/${pipeId}/phases/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds }),
    });
    if (response.ok) {
      const { phases } = await response.json();
      setPhaseList(phases);
    } else {
      setPhaseList(initialPhases);
    }
  }

  function handleDrop(targetId: string) {
    if (!draggedId || draggedId === targetId) return;

    const current = [...phaseList];
    const fromIndex = current.findIndex((p) => p.id === draggedId);
    const toIndex = current.findIndex((p) => p.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const [moved] = current.splice(fromIndex, 1);
    current.splice(toIndex, 0, moved);

    setPhaseList(current);
    setDraggedId(null);
    void persistOrder(current.map((p) => p.id));
  }

  return (
    <div data-testid="kanban-board" className="flex gap-4 overflow-x-auto p-6">
      {phaseList.map((phase) => (
        <div
          key={phase.id}
          data-testid="phase-column"
          className="w-72 shrink-0 rounded-lg bg-[#EEF0F3] p-3"
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => handleDrop(phase.id)}
        >
          <div
            data-testid="phase-column-header"
            draggable
            onDragStart={() => setDraggedId(phase.id)}
            className="mb-3 flex cursor-grab items-center gap-2 px-1"
          >
            <span className="text-sm font-semibold text-gray-800">
              {phase.name}
            </span>
            <span
              data-testid="phase-card-count"
              className="rounded bg-white px-1.5 py-0.5 text-xs text-gray-500"
            >
              0
            </span>
          </div>
          {/* Card list is populated once the Card entity (feature-004) lands */}
          <div className="flex h-40 items-center justify-center rounded-md bg-white/60 text-center text-xs text-gray-400" />
        </div>
      ))}
      <button
        type="button"
        className="h-fit w-56 shrink-0 rounded-lg border border-dashed border-gray-300 bg-white/60 px-4 py-2 text-sm text-gray-500 hover:border-gray-400"
      >
        + {dictionary.kanban.newPhase}
      </button>
    </div>
  );
}
