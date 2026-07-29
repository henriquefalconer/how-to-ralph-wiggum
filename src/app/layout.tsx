import { getLocale } from "@/lib/i18n/server";
import { rtlLocales } from "@/lib/i18n/locales";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clone",
  description: "Autonomously built product clone",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const dir = rtlLocales.includes(locale) ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
