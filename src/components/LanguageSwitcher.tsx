"use client";

import {
  LOCALE_COOKIE,
  type Locale,
  localeNames,
  locales,
} from "@/lib/i18n/locales";
import { useRouter } from "next/navigation";

export function LanguageSwitcher({
  locale,
  label,
}: {
  locale: Locale;
  label: string;
}) {
  const router = useRouter();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value;
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000`;
    router.refresh();
  }

  return (
    <label className="flex items-center gap-1.5 text-sm text-gray-500">
      <span className="sr-only">{label}</span>
      <select
        value={locale}
        onChange={handleChange}
        aria-label={label}
        className="cursor-pointer rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-600 hover:border-gray-300"
      >
        {locales.map((code) => (
          <option key={code} value={code}>
            {localeNames[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
