import type { Dictionary } from "./dictionaries";

export function formatCardsCount(
  dictionary: Dictionary,
  count: number,
  itemName?: string | null,
): string {
  if (itemName?.trim()) {
    return `${count} ${itemName.trim()}`;
  }
  const template =
    count === 1
      ? dictionary.home.cardsCountOne
      : dictionary.home.cardsCountOther;
  return template.replace("{n}", String(count));
}

export function formatRecordsCount(
  dictionary: Dictionary,
  count: number,
): string {
  const template =
    count === 1
      ? dictionary.database.recordsCountOne
      : dictionary.database.recordsCountOther;
  return template.replace("{n}", String(count));
}
