import { getDictionary } from "@/lib/i18n/server";
import { defaultLocale, isLocale } from "@/lib/i18n/locales";
import {
  INTERFACE_PRIVACY_TIERS,
  type InterfacePrivacyTier,
  createInterface,
  listInterfaces,
} from "@/lib/interfaces";
import { getDefaultOrgId } from "@/lib/pipes";
import { NextResponse } from "next/server";

function parsePrivacyTier(value: unknown): InterfacePrivacyTier | undefined {
  if (typeof value !== "string") return undefined;
  return (INTERFACE_PRIVACY_TIERS as readonly string[]).includes(value)
    ? (value as InterfacePrivacyTier)
    : undefined;
}

export async function GET() {
  const orgId = await getDefaultOrgId();
  const items = await listInterfaces(orgId);
  return NextResponse.json({ interfaces: items });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name : "";
  const icon = typeof body?.icon === "string" ? body.icon : undefined;
  const privacyTier = parsePrivacyTier(body?.privacyTier);
  const locale =
    typeof body?.locale === "string" && isLocale(body.locale)
      ? body.locale
      : defaultLocale;

  const orgId = await getDefaultOrgId();
  const dictionary = getDictionary(locale);

  try {
    const { iface, page } = await createInterface(
      orgId,
      { name, icon, privacyTier },
      dictionary.interfaces.defaultPageName,
    );
    return NextResponse.json({ interface: iface, page }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to create interface",
      },
      { status: 400 },
    );
  }
}
