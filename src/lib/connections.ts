import { db } from "@/lib/db";
import {
  connections,
  connectedRecords,
  cards,
  tableRecords,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function createConnection(data: {
  pipeId: string;
  name: string;
  targetType: "pipe" | "database";
  targetId: string;
  permission?: "search" | "create" | "both";
  cardinality?: "single" | "multiple";
  requireForNextPhase?: boolean;
  requireForFinalPhase?: boolean;
  blockNextPhaseUntilTargetDone?: boolean;
  blockFinalPhaseUntilTargetDone?: boolean;
  autofillFromTarget?: boolean;
}) {
  const [connection] = await db
    .insert(connections)
    .values({
      pipeId: data.pipeId,
      name: data.name,
      targetType: data.targetType,
      targetId: data.targetId,
      permission: data.permission || "both",
      cardinality: data.cardinality || "multiple",
      requireForNextPhase: data.requireForNextPhase || false,
      requireForFinalPhase: data.requireForFinalPhase || false,
      blockNextPhaseUntilTargetDone:
        data.blockNextPhaseUntilTargetDone || false,
      blockFinalPhaseUntilTargetDone:
        data.blockFinalPhaseUntilTargetDone || false,
      autofillFromTarget: data.autofillFromTarget || false,
    })
    .returning();
  return connection;
}

export async function getConnection(connectionId: string) {
  return await db.query.connections.findFirst({
    where: eq(connections.id, connectionId),
  });
}

export async function listConnections(pipeId: string) {
  return await db.query.connections.findMany({
    where: eq(connections.pipeId, pipeId),
  });
}

export async function listNavConnections(pipeId: string) {
  return await db.query.connections.findMany({
    where: and(
      eq(connections.pipeId, pipeId),
      eq(connections.targetType, "database"),
    ),
  });
}

export async function updateConnection(
  connectionId: string,
  data: Partial<{
    name: string;
    permission: "search" | "create" | "both";
    cardinality: "single" | "multiple";
    requireForNextPhase: boolean;
    requireForFinalPhase: boolean;
    blockNextPhaseUntilTargetDone: boolean;
    blockFinalPhaseUntilTargetDone: boolean;
    autofillFromTarget: boolean;
  }>,
) {
  const [updated] = await db
    .update(connections)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(connections.id, connectionId))
    .returning();
  return updated;
}

export async function deleteConnection(connectionId: string) {
  await db.delete(connections).where(eq(connections.id, connectionId));
}

export async function createConnectedRecord(data: {
  connectionId: string;
  sourceCardId: string;
  targetCardId?: string;
  targetRecordId?: string;
}) {
  const [record] = await db
    .insert(connectedRecords)
    .values({
      connectionId: data.connectionId,
      sourceCardId: data.sourceCardId,
      targetCardId: data.targetCardId,
      targetRecordId: data.targetRecordId,
    })
    .returning();
  return record;
}

export async function getConnectedRecord(recordId: string) {
  return await db.query.connectedRecords.findFirst({
    where: eq(connectedRecords.id, recordId),
  });
}

export async function listConnectedRecordsByConnection(connectionId: string) {
  return await db.query.connectedRecords.findMany({
    where: eq(connectedRecords.connectionId, connectionId),
  });
}

export async function listConnectedRecordsByCard(
  cardId: string,
  connectionId?: string,
) {
  if (connectionId) {
    return await db.query.connectedRecords.findMany({
      where: and(
        eq(connectedRecords.sourceCardId, cardId),
        eq(connectedRecords.connectionId, connectionId),
      ),
    });
  }
  return await db.query.connectedRecords.findMany({
    where: eq(connectedRecords.sourceCardId, cardId),
  });
}

export async function deleteConnectedRecord(recordId: string) {
  await db.delete(connectedRecords).where(eq(connectedRecords.id, recordId));
}
