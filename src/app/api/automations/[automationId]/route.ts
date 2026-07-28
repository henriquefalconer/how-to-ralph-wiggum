import {
  deleteAutomation,
  getAutomation,
  updateAutomation,
} from "@/lib/automations";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ automationId: string }> },
) {
  const { automationId } = await params;
  const automation = await getAutomation(automationId);
  if (!automation) {
    return NextResponse.json(
      { error: "Automation not found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ automation });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ automationId: string }> },
) {
  const { automationId } = await params;
  const body = await request.json().catch(() => null);

  try {
    const automation = await updateAutomation(automationId, {
      ...(typeof body?.name === "string" ? { name: body.name } : {}),
      ...(typeof body?.enabled === "boolean" ? { enabled: body.enabled } : {}),
      ...(body?.triggerConfig && typeof body.triggerConfig === "object"
        ? { triggerConfig: body.triggerConfig }
        : {}),
      ...(body?.actionConfig && typeof body.actionConfig === "object"
        ? { actionConfig: body.actionConfig }
        : {}),
    });
    return NextResponse.json({ automation });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to update automation",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ automationId: string }> },
) {
  const { automationId } = await params;
  try {
    await deleteAutomation(automationId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to delete automation",
      },
      { status: 404 },
    );
  }
}
