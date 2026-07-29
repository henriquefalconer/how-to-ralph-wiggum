import { getPipe, updatePipeSettings } from "@/lib/pipes";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const pipe = await getPipe(id);
  if (!pipe) {
    return NextResponse.json({ error: "Pipe not found" }, { status: 404 });
  }
  return NextResponse.json({ pipe });
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
    icon,
    tags,
    itemName,
    createCardButtonLabel,
    defaultView,
    titleFieldId,
    kanbanPreviewFieldIds,
    connectedCardFieldIds,
    expirationAlertTime,
    expirationAlertUnit,
    expirationAlertBusinessDaysOnly,
    visibility,
    aiAgentsEnabled,
    aiCopilotEnabled,
    allowBulkActions,
    restrictEditToAssignee,
    restrictDeleteToAdmin,
  } = body;

  try {
    const pipe = await updatePipeSettings(id, {
      ...(name !== undefined ? { name } : {}),
      ...(icon !== undefined ? { icon } : {}),
      ...(tags !== undefined ? { tags } : {}),
      ...(itemName !== undefined ? { itemName } : {}),
      ...(createCardButtonLabel !== undefined ? { createCardButtonLabel } : {}),
      ...(defaultView !== undefined ? { defaultView } : {}),
      ...(titleFieldId !== undefined ? { titleFieldId } : {}),
      ...(kanbanPreviewFieldIds !== undefined ? { kanbanPreviewFieldIds } : {}),
      ...(connectedCardFieldIds !== undefined ? { connectedCardFieldIds } : {}),
      ...(expirationAlertTime !== undefined ? { expirationAlertTime } : {}),
      ...(expirationAlertUnit !== undefined ? { expirationAlertUnit } : {}),
      ...(expirationAlertBusinessDaysOnly !== undefined
        ? { expirationAlertBusinessDaysOnly }
        : {}),
      ...(visibility !== undefined ? { visibility } : {}),
      ...(aiAgentsEnabled !== undefined ? { aiAgentsEnabled } : {}),
      ...(aiCopilotEnabled !== undefined ? { aiCopilotEnabled } : {}),
      ...(allowBulkActions !== undefined ? { allowBulkActions } : {}),
      ...(restrictEditToAssignee !== undefined
        ? { restrictEditToAssignee }
        : {}),
      ...(restrictDeleteToAdmin !== undefined ? { restrictDeleteToAdmin } : {}),
    });
    return NextResponse.json({ pipe });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update pipe" },
      { status: 400 },
    );
  }
}
