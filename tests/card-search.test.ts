import { describe, it, expect } from "vitest";

/**
 * Card search filter utility — case-insensitive substring match on card title
 */
function filterCardsByTitle(
  cards: Array<{ title: string }>,
  searchQuery: string,
): Array<{ title: string }> {
  const trimmed = searchQuery.trim().toLowerCase();
  if (!trimmed) return cards;
  return cards.filter((card) => card.title.toLowerCase().includes(trimmed));
}

describe("Card Search Filter", () => {
  it("matches a case-insensitive substring on card title only", () => {
    const cards = [
      { title: "João Silva" },
      { title: "Throwaway Test Card" },
      { title: "João Santos" },
    ];
    const result = filterCardsByTitle(cards, "joão");
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.title)).toEqual([
      "João Silva",
      "João Santos",
    ]);
  });

  it("returns all cards when search query is empty", () => {
    const cards = [{ title: "A" }, { title: "B" }, { title: "C" }];
    const result = filterCardsByTitle(cards, "");
    expect(result).toEqual(cards);
  });

  it("returns empty array when query matches no cards", () => {
    const cards = [{ title: "Alpha" }, { title: "Beta" }];
    const result = filterCardsByTitle(cards, "gamma");
    expect(result).toHaveLength(0);
  });

  it("handles whitespace-only query as empty", () => {
    const cards = [{ title: "Test" }, { title: "Card" }];
    const result = filterCardsByTitle(cards, "   ");
    expect(result).toEqual(cards);
  });

  it("matches partial strings mid-word", () => {
    const cards = [{ title: "Onboarding" }, { title: "Boarding Pass" }];
    const result = filterCardsByTitle(cards, "board");
    expect(result).toHaveLength(2);
  });

  it("is case-insensitive for uppercase queries", () => {
    const cards = [{ title: "João Silva" }];
    const result = filterCardsByTitle(cards, "JOÃO");
    expect(result).toHaveLength(1);
  });
});
