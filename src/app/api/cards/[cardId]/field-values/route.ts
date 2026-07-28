import { setPhaseFieldValue } from "@/lib/cards";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ cardId: string }> },
) {
  const { cardId } = await params;
  const body = await request.json().catch(() => null);
  const fieldId = typeof body?.fieldId === "string" ? body.fieldId : "";
  const value = typeof body?.value === "string" ? body.value : "";

  if (!fieldId) {
    return NextResponse.json({ error: "fieldId is required" }, { status: 400 });
  }

  try {
    await setPhaseFieldValue(cardId, fieldId, value);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to save field value",
      },
      { status: 400 },
    );
  }
}
