export const LOCALE_COOKIE = "locale";

export const locales = [
  "en",
  "pt",
  "es",
  "zh",
  "de",
  "fr",
  "ja",
  "hi",
  "ar",
  "ru",
] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  pt: "Português",
  es: "Español",
  zh: "中文",
  de: "Deutsch",
  fr: "Français",
  ja: "日本語",
  hi: "हिन्दी",
  ar: "العربية",
  ru: "Русский",
};

export const rtlLocales: readonly Locale[] = ["ar"];

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
