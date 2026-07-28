import { createRecord, listRecordsForTable } from "@/lib/tables";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const records = await listRecordsForTable(id);
  return NextResponse.json({ records });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const values =
    body && typeof body.values === "object" && body.values !== null
      ? body.values
      : {};

  try {
    const created = await createRecord(id, values);
    return NextResponse.json({ record: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to create record",
      },
      { status: 400 },
    );
  }
}
