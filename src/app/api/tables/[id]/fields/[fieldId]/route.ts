import { deleteField, updateField } from "@/lib/fields";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; fieldId: string }> },
) {
  const { id, fieldId } = await params;
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { label, required, help, description, minimalView, options } = body;

  try {
    const field = await updateField("table", id, fieldId, {
      ...(label !== undefined ? { label } : {}),
      ...(required !== undefined ? { required } : {}),
      ...(help !== undefined ? { help } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(minimalView !== undefined ? { minimalView } : {}),
      ...(options !== undefined ? { options } : {}),
    });
    return NextResponse.json({ field });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update field" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; fieldId: string }> },
) {
  const { id, fieldId } = await params;

  try {
    await deleteField("table", id, fieldId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete field" },
      { status: 400 },
    );
  }
}
