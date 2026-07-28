import type { Dictionary } from "./dictionaries";

export function formatCardsCount(
  dictionary: Dictionary,
  count: number,
): string {
  const template =
    count === 1
      ? dictionary.home.cardsCountOne
      : dictionary.home.cardsCountOther;
  return template.replace("{n}", String(count));
}
