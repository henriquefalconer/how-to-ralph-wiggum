import type { Card } from "@/lib/cards";

export function filterCardsByTitle(
  cards: Card[],
  searchQuery: string,
): Card[] {
  const trimmed = searchQuery.trim().toLowerCase();
  if (!trimmed) return cards;
  return cards.filter((card) => card.title.toLowerCase().includes(trimmed));
}
