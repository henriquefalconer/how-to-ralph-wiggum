import { FIELD_TYPES, createField, listFields } from "@/lib/fields";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const fields = await listFields("start_form", id);
  return NextResponse.json({ fields });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const label = typeof body?.label === "string" ? body.label : "";
  const type = body?.type;

  if (!label.trim()) {
    return NextResponse.json(
      { error: "Field label is required" },
      { status: 400 },
    );
  }
  if (!FIELD_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `Unknown field type: ${type}` },
      { status: 400 },
    );
  }

  try {
    const field = await createField("start_form", id, {
      label,
      type,
      required: body?.required === true,
      help: typeof body?.help === "string" ? body.help : null,
      description:
        typeof body?.description === "string" ? body.description : null,
      minimalView: body?.minimalView === true,
      options: Array.isArray(body?.options) ? body.options : undefined,
    });
    return NextResponse.json({ field }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create field" },
      { status: 400 },
    );
  }
}
