import { restoreCard } from "@/lib/cards";
import { db } from "@/lib/db";
import { cards } from "@/lib/db/schema";
import { getMemberRole } from "@/lib/pipe-members";
import { and, desc, eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const pipeId = (await params).id;

  const result = await db
    .select()
    .from(cards)
    .where(and(eq(cards.pipeId, pipeId), sql`deleted_at IS NOT NULL`))
    .orderBy(desc(cards.deletedAt));

  return NextResponse.json({
    cards: result.map((c) => ({
      id: c.id,
      title: c.title,
      deletedAt: c.deletedAt?.toISOString(),
      phaseId: c.phaseId,
    })),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const pipeId = (await params).id;
  const { action, cardId, userId } = await request.json();

  if (action === "restore") {
    try {
      await restoreCard(cardId, userId);
      return NextResponse.json({ success: true });
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 403 },
      );
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
