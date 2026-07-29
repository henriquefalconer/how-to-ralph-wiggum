"use client";

import { CreateCardPopover } from "@/components/CreateCardPopover";
import type { Card } from "@/lib/cards";
import type { Field } from "@/lib/fields";
import type { Dictionary } from "@/lib/i18n";
import type { Phase } from "@/lib/phases";
import * as Dialog from "@radix-ui/react-dialog";
import * as Popover from "@radix-ui/react-popover";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function KanbanBoard({
  pipeId,
  initialPhases,
  initialCards,
  startFormFields,
  dictionary,
  createCardButtonLabel,
}: {
  pipeId: string;
  initialPhases: Phase[];
  initialCards: Card[];
  startFormFields: Field[];
  dictionary: Dictionary;
  createCardButtonLabel?: string;
}) {
  const router = useRouter();
  const [phaseList, setPhaseList] = useState(initialPhases);
  const [cardList, setCardList] = useState(initialCards);
  const [draggedPhaseId, setDraggedPhaseId] = useState<string | null>(null);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [openCreatePhaseId, setOpenCreatePhaseId] = useState<string | null>(
    null,
  );
  const [creating, setCreating] = useState(false);
  const [shareFormPromoOpen, setShareFormPromoOpen] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    cardId: string;
  } | null>(null);

  function showToast(message: string, cardId: string) {
    setToast({ message, cardId });
    setTimeout(
      () =>
        setToast((current) => (current?.cardId === cardId ? null : current)),
      6000,
    );
  }

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

  async function persistCardMove(cardId: string, toPhaseId: string) {
    const response = await fetch(`/api/cards/${cardId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toPhaseId }),
    });
    if (!response.ok) {
      setCardList(initialCards);
      return;
    }
    const phase = phaseList.find((p) => p.id === toPhaseId);
    showToast(
      dictionary.card.moveSuccessToast.replace("{phase}", phase?.name ?? ""),
      cardId,
    );
  }

  function handlePhaseDrop(targetId: string) {
    if (!draggedPhaseId || draggedPhaseId === targetId) return;

    const current = [...phaseList];
    const fromIndex = current.findIndex((p) => p.id === draggedPhaseId);
    const toIndex = current.findIndex((p) => p.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const [moved] = current.splice(fromIndex, 1);
    current.splice(toIndex, 0, moved);

    setPhaseList(current);
    setDraggedPhaseId(null);
    void persistOrder(current.map((p) => p.id));
  }

  function handleCardDrop(targetPhaseId: string) {
    if (!draggedCardId) return;
    const card = cardList.find((c) => c.id === draggedCardId);
    setDraggedCardId(null);
    if (!card || card.phaseId === targetPhaseId) return;

    const targetPhase = phaseList.find((p) => p.id === targetPhaseId);
    setCardList((prev) =>
      prev.map((c) =>
        c.id === card.id
          ? { ...c, phaseId: targetPhaseId, done: targetPhase?.done ?? c.done }
          : c,
      ),
    );
    void persistCardMove(card.id, targetPhaseId);
  }

  function handleColumnDrop(phaseId: string) {
    if (draggedCardId) {
      handleCardDrop(phaseId);
    } else if (draggedPhaseId) {
      handlePhaseDrop(phaseId);
    }
  }

  function handleOpenCreate(phaseId: string) {
    if (startFormFields.length === 0) {
      setShareFormPromoOpen(true);
      return;
    }
    setOpenCreatePhaseId(phaseId);
  }

  async function handleCreateCard(
    phaseId: string,
    values: Record<string, string>,
  ): Promise<string | undefined> {
    setCreating(true);
    try {
      const response = await fetch(`/api/pipes/${pipeId}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phaseId, values }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        return body.error ?? "Failed to create card";
      }
      const card: Card = body.card;
      setCardList((prev) => [card, ...prev]);
      setOpenCreatePhaseId(null);
      showToast(dictionary.card.createSuccessToast, card.id);
    } finally {
      setCreating(false);
    }
  }

  const defaultCreatePhaseId =
    phaseList.find((p) => p.allowCardCreation)?.id ?? phaseList[0]?.id;

  return (
    <div>
      <div className="flex items-center justify-between px-6 pt-4">
        <button
          type="button"
          data-testid="create-card-button"
          disabled={!defaultCreatePhaseId}
          onClick={() =>
            defaultCreatePhaseId && handleOpenCreate(defaultCreatePhaseId)
          }
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          + {createCardButtonLabel ?? dictionary.kanban.createCard}
        </button>
      </div>

      <div
        data-testid="kanban-board"
        className="flex gap-4 overflow-x-auto p-6"
      >
        {phaseList.map((phase) => {
          const phaseCards = cardList.filter((c) => c.phaseId === phase.id);
          return (
            <div
              key={phase.id}
              data-testid="phase-column"
              data-phase-id={phase.id}
              className="w-72 shrink-0 rounded-lg bg-[#EEF0F3] p-3"
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleColumnDrop(phase.id)}
            >
              <div
                data-testid="phase-column-header"
                draggable
                onDragStart={() => {
                  setDraggedPhaseId(phase.id);
                  setDraggedCardId(null);
                }}
                className="mb-3 flex cursor-grab items-center gap-2 px-1"
              >
                <span className="text-sm font-semibold text-gray-800">
                  {phase.name}
                </span>
                <span
                  data-testid="phase-card-count"
                  className="rounded bg-white px-1.5 py-0.5 text-xs text-gray-500"
                >
                  {phaseCards.length}
                </span>
                {phase.allowCardCreation && (
                  <Popover.Root
                    open={openCreatePhaseId === phase.id}
                    onOpenChange={(open) =>
                      setOpenCreatePhaseId(open ? phase.id : null)
                    }
                  >
                    <Popover.Trigger asChild>
                      <button
                        type="button"
                        data-testid="add-card-button"
                        data-phase-id={phase.id}
                        onClick={() => handleOpenCreate(phase.id)}
                        className="ml-auto text-sm font-medium text-gray-500 hover:text-gray-800"
                      >
                        +
                      </button>
                    </Popover.Trigger>
                    <Popover.Portal>
                      <Popover.Content
                        align="start"
                        sideOffset={4}
                        className="z-10"
                      >
                        <CreateCardPopover
                          fields={startFormFields}
                          dictionary={dictionary}
                          submitting={creating}
                          onCancel={() => setOpenCreatePhaseId(null)}
                          onSubmit={(values) =>
                            handleCreateCard(phase.id, values)
                          }
                        />
                      </Popover.Content>
                    </Popover.Portal>
                  </Popover.Root>
                )}
              </div>

              <div className="space-y-2">
                {phaseCards.map((card) => (
                  <Link
                    key={card.id}
                    href={`/open-cards/${card.id}`}
                    data-testid="card-tile"
                    data-card-id={card.id}
                    draggable
                    onDragStart={() => {
                      setDraggedCardId(card.id);
                      setDraggedPhaseId(null);
                    }}
                    className={`block rounded-md bg-white p-2 text-sm shadow-sm hover:shadow ${
                      card.done ? "text-gray-400 line-through" : "text-gray-800"
                    }`}
                  >
                    {card.done && <span className="mr-1">✓</span>}
                    {card.title}
                  </Link>
                ))}
                {phaseCards.length === 0 && (
                  <div className="flex h-16 items-center justify-center rounded-md bg-white/60 text-center text-xs text-gray-400" />
                )}
              </div>
            </div>
          );
        })}
        <button
          type="button"
          className="h-fit w-56 shrink-0 rounded-lg border border-dashed border-gray-300 bg-white/60 px-4 py-2 text-sm text-gray-500 hover:border-gray-400"
        >
          + {dictionary.kanban.newPhase}
        </button>
      </div>

      <Dialog.Root
        open={shareFormPromoOpen}
        onOpenChange={setShareFormPromoOpen}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40" />
          <Dialog.Content
            data-testid="share-form-modal"
            className="fixed top-1/2 left-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <Dialog.Title className="text-lg font-semibold text-gray-900">
                {dictionary.card.shareFormTitle}
              </Dialog.Title>
              <Dialog.Close className="text-gray-400 hover:text-gray-600">
                ✕
              </Dialog.Close>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              {dictionary.card.shareFormBody}
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShareFormPromoOpen(false)}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                {dictionary.card.shareFormClose}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {toast && (
        <button
          type="button"
          data-testid="card-toast"
          onClick={() => {
            const cardId = toast.cardId;
            setToast(null);
            router.push(`/open-cards/${cardId}`);
          }}
          className="fixed bottom-6 left-6 z-20 max-w-sm rounded-md bg-gray-900 px-4 py-3 text-left text-sm text-white shadow-lg hover:bg-gray-800"
        >
          {toast.message}
        </button>
      )}
    </div>
  );
}
