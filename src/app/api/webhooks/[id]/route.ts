import { deleteWebhook } from "@/lib/webhooks";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    await deleteWebhook(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to delete webhook",
      },
      { status: 404 },
    );
  }
}
