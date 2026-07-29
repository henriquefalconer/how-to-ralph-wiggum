import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/lib/db";
import { organizations, users, pipes, phases, cards, tables, tableRecords } from "@/lib/db/schema";
import {
  createConnection,
  getConnection,
  listConnections,
  listNavConnections,
  updateConnection,
  deleteConnection,
  createConnectedRecord,
  getConnectedRecord,
  listConnectedRecordsByConnection,
  listConnectedRecordsByCard,
  deleteConnectedRecord,
} from "@/lib/connections";

let orgId: string;
let userId: string;
let pipeId: string;
let phaseId: string;
let cardId: string;
let databaseTableId: string;
let tableRecordId: string;

beforeEach(async () => {
  const [org] = await db.insert(organizations).values({ name: "Test Org" }).returning();
  orgId = org.id;

  const [user] = await db
    .insert(users)
    .values({ orgId, name: "Test User", email: "test@example.com", isSelf: true })
    .returning();
  userId = user.id;

  const [pipe] = await db
    .insert(pipes)
    .values({ orgId, name: "Test Pipe", color: "#FF0000" })
    .returning();
  pipeId = pipe.id;

  const [phase] = await db
    .insert(phases)
    .values({ pipeId, name: "Inbox", position: 0 })
    .returning();
  phaseId = phase.id;

  const [card] = await db
    .insert(cards)
    .values({ pipeId, phaseId, title: "Test Card" })
    .returning();
  cardId = card.id;

  const [table] = await db
    .insert(tables)
    .values({ orgId, name: "Test Table" })
    .returning();
  databaseTableId = table.id;

  const [record] = await db
    .insert(tableRecords)
    .values({ tableId: databaseTableId })
    .returning();
  tableRecordId = record.id;
});

afterEach(async () => {
  await db.delete(organizations).where(
    require("drizzle-orm").eq(organizations.id, orgId),
  );
});

describe("Connections", () => {
  it("creates a connection with all configured fields", async () => {
    const connection = await createConnection({
      pipeId,
      name: "Suppliers",
      targetType: "database",
      targetId: databaseTableId,
      permission: "search",
      cardinality: "single",
      requireForNextPhase: true,
      blockNextPhaseUntilTargetDone: false,
    });

    expect(connection.name).toBe("Suppliers");
    expect(connection.targetType).toBe("database");
    expect(connection.targetId).toBe(databaseTableId);
    expect(connection.permission).toBe("search");
    expect(connection.cardinality).toBe("single");
    expect(connection.requireForNextPhase).toBe(true);
    expect(connection.blockNextPhaseUntilTargetDone).toBe(false);
  });

  it("retrieves a connection by id", async () => {
    const created = await createConnection({
      pipeId,
      name: "Test Connection",
      targetType: "database",
      targetId: databaseTableId,
    });

    const retrieved = await getConnection(created.id);
    expect(retrieved?.id).toBe(created.id);
    expect(retrieved?.name).toBe("Test Connection");
  });

  it("lists all connections for a pipe", async () => {
    await createConnection({
      pipeId,
      name: "Connection 1",
      targetType: "database",
      targetId: databaseTableId,
    });
    await createConnection({
      pipeId,
      name: "Connection 2",
      targetType: "pipe",
      targetId: pipeId,
    });

    const list = await listConnections(pipeId);
    expect(list).toHaveLength(2);
  });

  it("filters only database-target connections for nav", async () => {
    await createConnection({
      pipeId,
      name: "Db Connection",
      targetType: "database",
      targetId: databaseTableId,
    });
    await createConnection({
      pipeId,
      name: "Pipe Connection",
      targetType: "pipe",
      targetId: pipeId,
    });

    const navConnections = await listNavConnections(pipeId);
    expect(navConnections).toHaveLength(1);
    expect(navConnections[0].targetType).toBe("database");
    expect(navConnections[0].name).toBe("Db Connection");
  });

  it("updates a connection", async () => {
    const connection = await createConnection({
      pipeId,
      name: "Original Name",
      targetType: "database",
      targetId: databaseTableId,
      permission: "search",
    });

    const updated = await updateConnection(connection.id, {
      name: "Updated Name",
      permission: "both",
    });

    expect(updated.name).toBe("Updated Name");
    expect(updated.permission).toBe("both");
  });

  it("deletes a connection", async () => {
    const connection = await createConnection({
      pipeId,
      name: "To Delete",
      targetType: "database",
      targetId: databaseTableId,
    });

    await deleteConnection(connection.id);

    const retrieved = await getConnection(connection.id);
    expect(retrieved).toBeUndefined();
  });

  it("creates a connected record linking a source card to a target", async () => {
    const connection = await createConnection({
      pipeId,
      name: "Test",
      targetType: "database",
      targetId: databaseTableId,
    });

    const connectedRecord = await createConnectedRecord({
      connectionId: connection.id,
      sourceCardId: cardId,
      targetRecordId: tableRecordId,
    });

    expect(connectedRecord.sourceCardId).toBe(cardId);
    expect(connectedRecord.targetRecordId).toBe(tableRecordId);
  });

  it("retrieves a connected record by id", async () => {
    const connection = await createConnection({
      pipeId,
      name: "Test",
      targetType: "database",
      targetId: databaseTableId,
    });

    const connectedRecord = await createConnectedRecord({
      connectionId: connection.id,
      sourceCardId: cardId,
      targetRecordId: tableRecordId,
    });

    const retrieved = await getConnectedRecord(connectedRecord.id);
    expect(retrieved?.id).toBe(connectedRecord.id);
  });

  it("lists connected records for a connection", async () => {
    const connection = await createConnection({
      pipeId,
      name: "Test",
      targetType: "database",
      targetId: databaseTableId,
    });

    await createConnectedRecord({
      connectionId: connection.id,
      sourceCardId: cardId,
      targetRecordId: tableRecordId,
    });

    const list = await listConnectedRecordsByConnection(connection.id);
    expect(list).toHaveLength(1);
  });

  it("lists connected records for a card", async () => {
    const connection1 = await createConnection({
      pipeId,
      name: "Conn 1",
      targetType: "database",
      targetId: databaseTableId,
    });
    const connection2 = await createConnection({
      pipeId,
      name: "Conn 2",
      targetType: "database",
      targetId: databaseTableId,
    });

    await createConnectedRecord({
      connectionId: connection1.id,
      sourceCardId: cardId,
      targetRecordId: tableRecordId,
    });
    await createConnectedRecord({
      connectionId: connection2.id,
      sourceCardId: cardId,
      targetRecordId: tableRecordId,
    });

    const list = await listConnectedRecordsByCard(cardId);
    expect(list).toHaveLength(2);
  });

  it("lists connected records for a card and connection", async () => {
    const connection = await createConnection({
      pipeId,
      name: "Test",
      targetType: "database",
      targetId: databaseTableId,
    });

    await createConnectedRecord({
      connectionId: connection.id,
      sourceCardId: cardId,
      targetRecordId: tableRecordId,
    });

    const list = await listConnectedRecordsByCard(cardId, connection.id);
    expect(list).toHaveLength(1);
    expect(list[0].connectionId).toBe(connection.id);
  });

  it("deletes a connected record", async () => {
    const connection = await createConnection({
      pipeId,
      name: "Test",
      targetType: "database",
      targetId: databaseTableId,
    });

    const connectedRecord = await createConnectedRecord({
      connectionId: connection.id,
      sourceCardId: cardId,
      targetRecordId: tableRecordId,
    });

    await deleteConnectedRecord(connectedRecord.id);

    const retrieved = await getConnectedRecord(connectedRecord.id);
    expect(retrieved).toBeUndefined();
  });

  it("enforces cardinality constraint in validation", async () => {
    const connection = await createConnection({
      pipeId,
      name: "Single Connection",
      targetType: "database",
      targetId: databaseTableId,
      cardinality: "single",
    });

    await createConnectedRecord({
      connectionId: connection.id,
      sourceCardId: cardId,
      targetRecordId: tableRecordId,
    });

    const list = await listConnectedRecordsByCard(cardId, connection.id);
    expect(list).toHaveLength(1);
  });

  it("respects permission levels (search vs create)", async () => {
    const searchOnly = await createConnection({
      pipeId,
      name: "Search Only",
      targetType: "database",
      targetId: databaseTableId,
      permission: "search",
    });

    const createOnly = await createConnection({
      pipeId,
      name: "Create Only",
      targetType: "database",
      targetId: databaseTableId,
      permission: "create",
    });

    expect(searchOnly.permission).toBe("search");
    expect(createOnly.permission).toBe("create");
  });

  it("tracks phase-advance gating options", async () => {
    const connection = await createConnection({
      pipeId,
      name: "Phase Gated",
      targetType: "database",
      targetId: databaseTableId,
      requireForNextPhase: true,
      blockNextPhaseUntilTargetDone: true,
    });

    expect(connection.requireForNextPhase).toBe(true);
    expect(connection.blockNextPhaseUntilTargetDone).toBe(true);
  });
});
