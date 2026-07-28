import { db } from "@/lib/db";
import { organizations, phases, pipes } from "@/lib/db/schema";
import type { Dictionary } from "@/lib/i18n";
import { asc, count, eq } from "drizzle-orm";

const PIPE_COLOR_PALETTE = [
  "#1AB6A6",
  "#3DBE5B",
  "#F2994A",
  "#EB5757",
  "#9B51E0",
  "#2E68D9",
  "#F2C94C",
  "#56CCF2",
];

export interface PipeSummary {
  id: string;
  name: string;
  color: string;
  cardsCount: number;
}

export async function getDefaultOrgId(): Promise<string> {
  const [existing] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .limit(1);
  if (existing) return existing.id;

  const [created] = await db
    .insert(organizations)
    .values({ name: "Default Organization" })
    .returning({ id: organizations.id });
  return created.id;
}

export async function listPipes(orgId: string): Promise<PipeSummary[]> {
  const rows = await db
    .select()
    .from(pipes)
    .where(eq(pipes.orgId, orgId))
    .orderBy(asc(pipes.createdAt));

  // No Card entity exists yet (feature-004) — every pipe has 0 cards until then.
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    cardsCount: 0,
  }));
}

export async function createPipe(
  orgId: string,
  name: string,
  defaultPhaseNames: Dictionary["defaultPhase"],
) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Pipe name is required");
  }

  const [{ value: existingCount }] = await db
    .select({ value: count() })
    .from(pipes)
    .where(eq(pipes.orgId, orgId));
  const color = PIPE_COLOR_PALETTE[existingCount % PIPE_COLOR_PALETTE.length];

  const [pipe] = await db
    .insert(pipes)
    .values({ orgId, name: trimmed, color })
    .returning();

  await db.insert(phases).values([
    {
      pipeId: pipe.id,
      name: defaultPhaseNames.inbox,
      done: false,
      position: 0,
      allowCardCreation: true,
    },
    {
      pipeId: pipe.id,
      name: defaultPhaseNames.doing,
      done: false,
      position: 1,
    },
    { pipeId: pipe.id, name: defaultPhaseNames.done, done: true, position: 2 },
  ]);

  return pipe;
}

export async function getPipeWithPhases(pipeId: string) {
  const [pipe] = await db.select().from(pipes).where(eq(pipes.id, pipeId));
  if (!pipe) return null;

  const pipePhases = await db
    .select()
    .from(phases)
    .where(eq(phases.pipeId, pipeId))
    .orderBy(asc(phases.position));

  return { pipe, phases: pipePhases };
}
