import { deleteRecord, getRecordDetail } from "@/lib/tables";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; recordId: string }> },
) {
  const { recordId } = await params;
  const detail = await getRecordDetail(recordId);
  if (!detail) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }
  return NextResponse.json({ detail });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; recordId: string }> },
) {
  const { recordId } = await params;
  try {
    await deleteRecord(recordId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to delete record",
      },
      { status: 400 },
    );
  }
}
