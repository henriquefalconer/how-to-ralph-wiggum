"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";

interface TrashCard {
  id: string;
  title: string;
  deletedAt: string;
  phaseId: string;
}

export function TrashModal({
  pipeId,
  open,
  onOpenChange,
}: {
  pipeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [cards, setCards] = useState<TrashCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;

    const loadTrash = async () => {
      setLoading(true);
      const res = await fetch(`/api/pipes/${pipeId}/trash`);
      const data = await res.json();
      setCards(data.cards || []);
      setLoading(false);
    };

    loadTrash();
  }, [open, pipeId]);

  const handleRestore = async (cardId: string) => {
    try {
      const res = await fetch(`/api/pipes/${pipeId}/trash`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "restore",
          cardId,
          userId: (window as any).__userId,
        }),
      });

      if (res.ok) {
        setCards((prev) => prev.filter((c) => c.id !== cardId));
      } else {
        const data = await res.json();
        alert(`Erro ao restaurar: ${data.error}`);
      }
    } catch (error) {
      console.error("Error restoring card:", error);
    }
  };

  const isEmpty = cards.length === 0;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <div className="relative bg-white rounded-lg shadow-lg w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <Dialog.Title className="text-lg font-semibold">
                Lixeira
              </Dialog.Title>
              <p className="text-sm text-gray-600 mt-1">
                Os cards ficam aqui por 15 dias. Depois disso, não podem ser
                restaurados.
              </p>
            </div>
            <Dialog.Close className="p-1 hover:bg-gray-100 rounded">
              <span className="text-lg">×</span>
            </Dialog.Close>
          </div>

          {loading ? (
            <div className="p-6 text-center text-gray-500">Carregando...</div>
          ) : isEmpty ? (
            <div className="p-6 text-center text-gray-500">
              A lixeira está vazia. Os cards excluídos aparecerão aqui.
            </div>
          ) : (
            <div className="divide-y">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <p className="font-medium">{card.title}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(card.deletedAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRestore(card.id)}
                    className="px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded"
                  >
                    Restaurar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
