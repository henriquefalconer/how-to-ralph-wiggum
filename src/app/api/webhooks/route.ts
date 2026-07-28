import {
  listWebhooks,
  registerWebhook,
  webhookScopeTypes,
} from "@/lib/webhooks";
import { NextResponse } from "next/server";

function isScopeType(
  value: string | null,
): value is (typeof webhookScopeTypes)[number] {
  return (
    value !== null && (webhookScopeTypes as readonly string[]).includes(value)
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scopeType = searchParams.get("scopeType");
  const scopeId = searchParams.get("scopeId");

  if (!isScopeType(scopeType) || !scopeId) {
    return NextResponse.json(
      { error: "scopeType and scopeId query params are required" },
      { status: 400 },
    );
  }

  const webhooks = await listWebhooks(scopeType, scopeId);
  return NextResponse.json({ webhooks });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const scopeType = typeof body?.scopeType === "string" ? body.scopeType : null;
  const scopeId = typeof body?.scopeId === "string" ? body.scopeId : "";
  const url = typeof body?.url === "string" ? body.url : "";
  const events = Array.isArray(body?.events) ? body.events : [];

  if (!isScopeType(scopeType) || !scopeId) {
    return NextResponse.json(
      { error: "scopeType and scopeId are required" },
      { status: 400 },
    );
  }

  try {
    const webhook = await registerWebhook(scopeType, scopeId, url, events);
    return NextResponse.json({ webhook }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to register webhook",
      },
      { status: 400 },
    );
  }
}
