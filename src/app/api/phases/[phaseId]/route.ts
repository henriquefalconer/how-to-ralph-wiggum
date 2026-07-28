import { deletePhase, updatePhase } from "@/lib/phases";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ phaseId: string }> },
) {
  const { phaseId } = await params;
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const {
    name,
    color,
    description,
    done,
    allowCardCreation,
    collectTaskEmails,
    autoAssignUserIds,
    slaTime,
    slaUnit,
  } = body;

  try {
    const phase = await updatePhase(phaseId, {
      ...(name !== undefined ? { name } : {}),
      ...(color !== undefined ? { color } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(done !== undefined ? { done } : {}),
      ...(allowCardCreation !== undefined ? { allowCardCreation } : {}),
      ...(collectTaskEmails !== undefined ? { collectTaskEmails } : {}),
      ...(autoAssignUserIds !== undefined ? { autoAssignUserIds } : {}),
      ...(slaTime !== undefined ? { slaTime } : {}),
      ...(slaUnit !== undefined ? { slaUnit } : {}),
    });
    return NextResponse.json({ phase });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update phase" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ phaseId: string }> },
) {
  const { phaseId } = await params;

  try {
    await deletePhase(phaseId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete phase" },
      { status: 400 },
    );
  }
}
