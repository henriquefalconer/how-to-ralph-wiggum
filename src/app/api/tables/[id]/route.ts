import { deleteTable, getTable, updateTableSettings } from "@/lib/tables";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const table = await getTable(id);
  if (!table) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }
  return NextResponse.json({ table });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const {
    name,
    titleFieldId,
    subtitleTemplate,
    createButtonLabel,
    public: isPublic,
    allMembersCanCrud,
  } = body;

  try {
    const table = await updateTableSettings(id, {
      ...(name !== undefined ? { name } : {}),
      ...(titleFieldId !== undefined ? { titleFieldId } : {}),
      ...(subtitleTemplate !== undefined ? { subtitleTemplate } : {}),
      ...(createButtonLabel !== undefined ? { createButtonLabel } : {}),
      ...(isPublic !== undefined ? { public: isPublic } : {}),
      ...(allMembersCanCrud !== undefined ? { allMembersCanCrud } : {}),
    });
    return NextResponse.json({ table });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update table" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await deleteTable(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete table" },
      { status: 400 },
    );
  }
}
