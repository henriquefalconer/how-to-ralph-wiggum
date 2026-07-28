import {
  deleteFieldConditional,
  updateFieldConditional,
} from "@/lib/field-conditionals";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ phaseId: string; id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { name, conditionGroups, trueActions, falseActions } = body;

  try {
    const fieldConditional = await updateFieldConditional(id, {
      ...(name !== undefined ? { name } : {}),
      ...(conditionGroups !== undefined ? { conditionGroups } : {}),
      ...(trueActions !== undefined ? { trueActions } : {}),
      ...(falseActions !== undefined ? { falseActions } : {}),
    });
    return NextResponse.json({ fieldConditional });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to update conditional",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ phaseId: string; id: string }> },
) {
  const { id } = await params;

  try {
    await deleteFieldConditional(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to delete conditional",
      },
      { status: 404 },
    );
  }
}
