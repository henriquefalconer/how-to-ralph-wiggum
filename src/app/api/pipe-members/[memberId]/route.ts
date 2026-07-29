import { getMember, removeMember, updateMemberRole } from "@/lib/pipe-members";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const { memberId } = await params;
  const member = await getMember(memberId);
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  return NextResponse.json({ member });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const { memberId } = await params;
  const body = await request.json().catch(() => null);
  const role = typeof body?.role === "string" ? body.role : "";

  try {
    const member = await updateMemberRole(memberId, role);
    return NextResponse.json({ member });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to update role",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const { memberId } = await params;
  try {
    await removeMember(memberId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to remove member",
      },
      { status: 400 },
    );
  }
}
