import {
  createAutomation,
  isAutomationActionType,
  isAutomationTriggerType,
  listAutomations,
} from "@/lib/automations";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const automations = await listAutomations(id);
  return NextResponse.json({ automations });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const name = typeof body?.name === "string" ? body.name : "";
  const triggerType =
    typeof body?.triggerType === "string" ? body.triggerType : "";
  const actionType =
    typeof body?.actionType === "string" ? body.actionType : "";
  const triggerConfig =
    body?.triggerConfig && typeof body.triggerConfig === "object"
      ? body.triggerConfig
      : {};
  const actionConfig =
    body?.actionConfig && typeof body.actionConfig === "object"
      ? body.actionConfig
      : {};
  const enabled = typeof body?.enabled === "boolean" ? body.enabled : true;

  if (!isAutomationTriggerType(triggerType)) {
    return NextResponse.json(
      { error: "A valid triggerType is required" },
      { status: 400 },
    );
  }
  if (!isAutomationActionType(actionType)) {
    return NextResponse.json(
      { error: "A valid actionType is required" },
      { status: 400 },
    );
  }

  try {
    const automation = await createAutomation(id, {
      name,
      enabled,
      triggerType,
      triggerConfig,
      actionType,
      actionConfig,
    });
    return NextResponse.json({ automation }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to create automation",
      },
      { status: 400 },
    );
  }
}
