import { getDictionary } from "@/lib/i18n";
import { defaultLocale, isLocale } from "@/lib/i18n/locales";
import { createPipe, getDefaultOrgId, listPipes } from "@/lib/pipes";
import { NextResponse } from "next/server";

export async function GET() {
  const orgId = await getDefaultOrgId();
  const pipes = await listPipes(orgId);
  return NextResponse.json({ pipes });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name : "";
  const locale =
    typeof body?.locale === "string" && isLocale(body.locale)
      ? body.locale
      : defaultLocale;

  if (!name.trim()) {
    return NextResponse.json(
      { error: "Pipe name is required" },
      { status: 400 },
    );
  }

  const orgId = await getDefaultOrgId();
  const dictionary = getDictionary(locale);
  const pipe = await createPipe(orgId, name, dictionary.defaultPhase);

  return NextResponse.json({ pipe }, { status: 201 });
}
