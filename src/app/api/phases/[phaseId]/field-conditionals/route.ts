import {
  createFieldConditional,
  listFieldConditionals,
} from "@/lib/field-conditionals";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ phaseId: string }> },
) {
  const { phaseId } = await params;
  const fieldConditionals = await listFieldConditionals(phaseId);
  return NextResponse.json({ fieldConditionals });
}

export async function POST(
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

  const name = typeof body.name === "string" ? body.name : "";
  const conditionGroups = Array.isArray(body.conditionGroups)
    ? body.conditionGroups
    : [];
  const trueActions = Array.isArray(body.trueActions) ? body.trueActions : [];
  const falseActions = Array.isArray(body.falseActions)
    ? body.falseActions
    : [];

  try {
    const fieldConditional = await createFieldConditional(phaseId, {
      name,
      conditionGroups,
      trueActions,
      falseActions,
    });
    return NextResponse.json({ fieldConditional }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to create conditional",
      },
      { status: 400 },
    );
  }
}
