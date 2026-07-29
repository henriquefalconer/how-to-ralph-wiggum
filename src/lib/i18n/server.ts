import { cookies } from "next/headers";
import { type Dictionary, dictionaries } from "./dictionaries";
import { LOCALE_COOKIE, type Locale, defaultLocale, isLocale } from "./locales";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return value && isLocale(value) ? value : defaultLocale;
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export async function getTranslations(): Promise<{
  locale: Locale;
  dictionary: Dictionary;
}> {
  const locale = await getLocale();
  return { locale, dictionary: getDictionary(locale) };
}
