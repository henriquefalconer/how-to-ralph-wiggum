import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/locales";
import Link from "next/link";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function TopNav({
  locale,
  dictionary,
}: { locale: Locale; dictionary: Dictionary }) {
  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
      <nav className="flex items-center gap-6">
        <span className="text-lg font-semibold text-gray-900">pipefy</span>
        <Link
          href="/"
          className="rounded-full bg-gray-900 px-3 py-1.5 text-sm font-medium text-white"
        >
          {dictionary.nav.home}
        </Link>
        {/* Portal, Tasks, Learning Center are separate PRD features not yet built */}
        <span className="text-sm text-gray-400">{dictionary.nav.portal}</span>
        <span className="text-sm text-gray-400">{dictionary.nav.tasks}</span>
        <Link
          href="/interfaces"
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          {dictionary.nav.interfaces}
        </Link>
        <span className="text-sm text-gray-400">
          {dictionary.nav.learningCenter}
        </span>
      </nav>
      <LanguageSwitcher locale={locale} label={dictionary.language.label} />
    </header>
  );
}
