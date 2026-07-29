import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { createLabel, listLabels } from "@/lib/labels";
import { createPipe } from "@/lib/pipes";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

describe("labels", () => {
  let orgId: string;
  let pipeId: string;

  beforeAll(async () => {
    const [org] = await db
      .insert(organizations)
      .values({ name: "Test Org (labels.test.ts)" })
      .returning();
    orgId = org.id;
  });

  beforeEach(async () => {
    const pipe = await createPipe(
      orgId,
      "Test Pipe",
      dictionaries.en.defaultPhase,
    );
    pipeId = pipe.id;
  });

  afterAll(async () => {
    await db.delete(organizations).where(eq(organizations.id, orgId));
  });

  it("label creation requires a non-empty name", async () => {
    await expect(
      createLabel(pipeId, { name: "", color: "#35FFDD" }),
    ).rejects.toThrow();

    const labels = await listLabels(pipeId);
    expect(labels).toHaveLength(0);
  });

  it("label color defaults when not specified", async () => {
    const label = await createLabel(pipeId, { name: "Urgente" });
    expect(label.color).toBe("#35FFDD");
  });

  it("creates a label with an explicit color", async () => {
    const label = await createLabel(pipeId, {
      name: "High Priority",
      color: "#FF5733",
    });
    expect(label.name).toBe("High Priority");
    expect(label.color).toBe("#FF5733");
    expect(label.pipeId).toBe(pipeId);
  });

  it("lists labels for a pipe", async () => {
    await createLabel(pipeId, { name: "Urgent" });
    await createLabel(pipeId, { name: "Low Priority", color: "#00FF00" });

    const labels = await listLabels(pipeId);
    expect(labels).toHaveLength(2);
    expect(labels[0].name).toBe("Urgent");
    expect(labels[1].name).toBe("Low Priority");
  });

  it("allows duplicate label names in the same pipe (per target behavior)", async () => {
    await createLabel(pipeId, { name: "Urgente" });
    await createLabel(pipeId, { name: "Urgente", color: "#FF0000" });

    const labels = await listLabels(pipeId);
    expect(labels).toHaveLength(2);
  });

  it("sets created_at timestamp on label creation", async () => {
    const label = await createLabel(pipeId, { name: "Test" });
    expect(label.createdAt).toBeInstanceOf(Date);
  });

  it("persists labels across queries", async () => {
    const created = await createLabel(pipeId, { name: "Persistent" });
    const listed = await listLabels(pipeId);
    const found = listed.find((l) => l.id === created.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe("Persistent");
  });
});
