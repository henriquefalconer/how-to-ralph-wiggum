import { describe, it, expect, beforeEach } from "vitest";
import { randomUUID } from "crypto";
import * as aiAgentsLib from "@/lib/ai-agents";
import * as pipesLib from "@/lib/pipes";

const uuid = randomUUID;

describe("AI Agents", () => {
  let orgId: string;
  let pipeId: string;

  beforeEach(async () => {
    orgId = uuid();
    const pipe = await pipesLib.createPipe({
      orgId,
      name: "Test Pipe",
    });
    pipeId = pipe.id;
  });

  it("creates an agent with draft status by default", async () => {
    const agent = await aiAgentsLib.createAgent(
      pipeId,
      "Test Agent",
    );
    expect(agent.id).toBeDefined();
    expect(agent.pipeId).toBe(pipeId);
    expect(agent.name).toBe("Test Agent");
    expect(agent.status).toBe("draft");
    expect(agent.description).toBe("");
  });

  it("creates an agent with default 'Agente sem título' name when name is omitted", async () => {
    const agent = await aiAgentsLib.createAgent(pipeId);
    expect(agent.name).toBe("Agente sem título");
    expect(agent.status).toBe("draft");
  });

  it("retrieves an agent by id", async () => {
    const created = await aiAgentsLib.createAgent(pipeId, "Test Agent");
    const retrieved = await aiAgentsLib.getAgent(created.id);
    expect(retrieved?.id).toBe(created.id);
    expect(retrieved?.name).toBe("Test Agent");
  });

  it("lists agents for a pipe ordered by creation time", async () => {
    const agent1 = await aiAgentsLib.createAgent(pipeId, "Agent 1");
    const agent2 = await aiAgentsLib.createAgent(pipeId, "Agent 2");
    const agents = await aiAgentsLib.listAgents(pipeId);
    expect(agents.length).toBeGreaterThanOrEqual(2);
    const ids = agents.map((a) => a.id);
    expect(ids).toContain(agent1.id);
    expect(ids).toContain(agent2.id);
    expect(ids[0]).toBe(agent2.id);
  });

  it("updates an agent's properties", async () => {
    const agent = await aiAgentsLib.createAgent(pipeId, "Original Name");
    const updated = await aiAgentsLib.updateAgent(agent.id, {
      name: "Updated Name",
      status: "active",
      description: "New description",
    });
    expect(updated.name).toBe("Updated Name");
    expect(updated.status).toBe("active");
    expect(updated.description).toBe("New description");
  });

  it("deletes an agent", async () => {
    const agent = await aiAgentsLib.createAgent(pipeId, "Test Agent");
    await aiAgentsLib.deleteAgent(agent.id);
    const retrieved = await aiAgentsLib.getAgent(agent.id);
    expect(retrieved).toBeUndefined();
  });

  it("creates a behavior with trigger configuration", async () => {
    const agent = await aiAgentsLib.createAgent(pipeId, "Test Agent");
    const behavior = await aiAgentsLib.createBehavior(agent.id, {
      title: "Test Behavior",
      triggerType: "card_entered_phase",
      triggerConfig: { phaseId: "phase-123", conditions: [] },
      instructions: "Do something",
      modelTier: "standard",
      skills: { documentAnalysis: true },
      effort: "standard",
    });
    expect(behavior.id).toBeDefined();
    expect(behavior.agentId).toBe(agent.id);
    expect(behavior.title).toBe("Test Behavior");
    expect(behavior.triggerType).toBe("card_entered_phase");
    expect(behavior.enabled).toBe(true);
    expect(behavior.instructions).toBe("Do something");
    expect(behavior.modelTier).toBe("standard");
    expect((behavior.skills as any).documentAnalysis).toBe(true);
  });

  it("behavior defaults modelTier to org_default", async () => {
    const agent = await aiAgentsLib.createAgent(pipeId, "Test Agent");
    const behavior = await aiAgentsLib.createBehavior(agent.id, {
      title: "Test Behavior",
      triggerType: "field_updated",
    });
    expect(behavior.modelTier).toBe("org_default");
  });

  it("retrieves a behavior by id", async () => {
    const agent = await aiAgentsLib.createAgent(pipeId, "Test Agent");
    const created = await aiAgentsLib.createBehavior(agent.id, {
      title: "Test Behavior",
      triggerType: "card_created",
    });
    const retrieved = await aiAgentsLib.getBehavior(created.id);
    expect(retrieved?.id).toBe(created.id);
    expect(retrieved?.title).toBe("Test Behavior");
  });

  it("lists behaviors for an agent", async () => {
    const agent = await aiAgentsLib.createAgent(pipeId, "Test Agent");
    const behavior1 = await aiAgentsLib.createBehavior(agent.id, {
      title: "Behavior 1",
      triggerType: "card_entered_phase",
    });
    const behavior2 = await aiAgentsLib.createBehavior(agent.id, {
      title: "Behavior 2",
      triggerType: "field_updated",
    });
    const behaviors = await aiAgentsLib.listBehaviors(agent.id);
    expect(behaviors.length).toBeGreaterThanOrEqual(2);
    const ids = behaviors.map((b) => b.id);
    expect(ids).toContain(behavior1.id);
    expect(ids).toContain(behavior2.id);
  });

  it("updates a behavior", async () => {
    const agent = await aiAgentsLib.createAgent(pipeId, "Test Agent");
    const behavior = await aiAgentsLib.createBehavior(agent.id, {
      title: "Original Title",
      triggerType: "card_created",
    });
    const updated = await aiAgentsLib.updateBehavior(behavior.id, {
      title: "Updated Title",
      enabled: false,
      instructions: "Updated instructions",
    });
    expect(updated.title).toBe("Updated Title");
    expect(updated.enabled).toBe(false);
    expect(updated.instructions).toBe("Updated instructions");
  });

  it("deletes a behavior", async () => {
    const agent = await aiAgentsLib.createAgent(pipeId, "Test Agent");
    const behavior = await aiAgentsLib.createBehavior(agent.id, {
      title: "Test Behavior",
      triggerType: "card_created",
    });
    await aiAgentsLib.deleteBehavior(behavior.id);
    const retrieved = await aiAgentsLib.getBehavior(behavior.id);
    expect(retrieved).toBeUndefined();
  });

  it("creates a knowledge source of type plain_text", async () => {
    const agent = await aiAgentsLib.createAgent(pipeId, "Test Agent");
    const source = await aiAgentsLib.createKnowledgeSource(agent.id, {
      type: "plain_text",
      name: "Test Knowledge",
      usageDescription: "For testing",
      content: "This is test content",
    });
    expect(source.id).toBeDefined();
    expect(source.agentId).toBe(agent.id);
    expect(source.type).toBe("plain_text");
    expect(source.name).toBe("Test Knowledge");
    expect(source.content).toBe("This is test content");
  });

  it("creates a knowledge source of type pipe_database", async () => {
    const agent = await aiAgentsLib.createAgent(pipeId, "Test Agent");
    const source = await aiAgentsLib.createKnowledgeSource(agent.id, {
      type: "pipe_database",
      name: "Pipe Knowledge",
      sourcePipeId: pipeId,
    });
    expect(source.type).toBe("pipe_database");
    expect(source.sourcePipeId).toBe(pipeId);
  });

  it("lists knowledge sources for an agent", async () => {
    const agent = await aiAgentsLib.createAgent(pipeId, "Test Agent");
    const source1 = await aiAgentsLib.createKnowledgeSource(agent.id, {
      type: "plain_text",
      name: "Source 1",
      content: "Content 1",
    });
    const source2 = await aiAgentsLib.createKnowledgeSource(agent.id, {
      type: "plain_text",
      name: "Source 2",
      content: "Content 2",
    });
    const sources = await aiAgentsLib.listKnowledgeSources(agent.id);
    expect(sources.length).toBeGreaterThanOrEqual(2);
    const ids = sources.map((s) => s.id);
    expect(ids).toContain(source1.id);
    expect(ids).toContain(source2.id);
  });

  it("deletes a knowledge source", async () => {
    const agent = await aiAgentsLib.createAgent(pipeId, "Test Agent");
    const source = await aiAgentsLib.createKnowledgeSource(agent.id, {
      type: "plain_text",
      name: "Test",
      content: "Content",
    });
    await aiAgentsLib.deleteKnowledgeSource(source.id);
    const sources = await aiAgentsLib.listKnowledgeSources(agent.id);
    expect(sources.find((s) => s.id === source.id)).toBeUndefined();
  });

  it("creates an agent run with status", async () => {
    const agent = await aiAgentsLib.createAgent(pipeId, "Test Agent");
    const behavior = await aiAgentsLib.createBehavior(agent.id, {
      title: "Test",
      triggerType: "card_created",
    });
    const card = await pipesLib.createCard({
      pipeId,
      title: "Test Card",
      phaseId: "phase-1",
    });
    const run = await aiAgentsLib.createAgentRun(
      agent.id,
      behavior.id,
      card.id,
      "success",
      "Agent executed successfully",
    );
    expect(run.id).toBeDefined();
    expect(run.agentId).toBe(agent.id);
    expect(run.behaviorId).toBe(behavior.id);
    expect(run.cardId).toBe(card.id);
    expect(run.status).toBe("success");
    expect(run.message).toBe("Agent executed successfully");
  });

  it("retrieves an agent run by id", async () => {
    const agent = await aiAgentsLib.createAgent(pipeId, "Test Agent");
    const behavior = await aiAgentsLib.createBehavior(agent.id, {
      title: "Test",
      triggerType: "card_created",
    });
    const card = await pipesLib.createCard({
      pipeId,
      title: "Test Card",
      phaseId: "phase-1",
    });
    const created = await aiAgentsLib.createAgentRun(
      agent.id,
      behavior.id,
      card.id,
      "running",
    );
    const retrieved = await aiAgentsLib.getAgentRun(created.id);
    expect(retrieved?.id).toBe(created.id);
    expect(retrieved?.status).toBe("running");
  });

  it("lists agent runs ordered by start time", async () => {
    const agent = await aiAgentsLib.createAgent(pipeId, "Test Agent");
    const behavior = await aiAgentsLib.createBehavior(agent.id, {
      title: "Test",
      triggerType: "card_created",
    });
    const card = await pipesLib.createCard({
      pipeId,
      title: "Test Card",
      phaseId: "phase-1",
    });
    const run1 = await aiAgentsLib.createAgentRun(
      agent.id,
      behavior.id,
      card.id,
      "success",
    );
    const run2 = await aiAgentsLib.createAgentRun(
      agent.id,
      behavior.id,
      card.id,
      "error",
      "Failed",
    );
    const runs = await aiAgentsLib.listAgentRuns(agent.id);
    expect(runs.length).toBeGreaterThanOrEqual(2);
    const ids = runs.map((r) => r.id);
    expect(ids).toContain(run1.id);
    expect(ids).toContain(run2.id);
    expect(ids[0]).toBe(run2.id);
  });

  it("lists behavior runs by behavior id", async () => {
    const agent = await aiAgentsLib.createAgent(pipeId, "Test Agent");
    const behavior1 = await aiAgentsLib.createBehavior(agent.id, {
      title: "Behavior 1",
      triggerType: "card_created",
    });
    const behavior2 = await aiAgentsLib.createBehavior(agent.id, {
      title: "Behavior 2",
      triggerType: "field_updated",
    });
    const card = await pipesLib.createCard({
      pipeId,
      title: "Test Card",
      phaseId: "phase-1",
    });
    await aiAgentsLib.createAgentRun(
      agent.id,
      behavior1.id,
      card.id,
      "success",
    );
    await aiAgentsLib.createAgentRun(
      agent.id,
      behavior2.id,
      card.id,
      "success",
    );
    const runs = await aiAgentsLib.listBehaviorRuns(behavior1.id);
    const run1Ids = runs.map((r) => r.behaviorId);
    expect(run1Ids.every((id) => id === behavior1.id)).toBe(true);
  });

  it("updates an agent run with finished_at and status", async () => {
    const agent = await aiAgentsLib.createAgent(pipeId, "Test Agent");
    const behavior = await aiAgentsLib.createBehavior(agent.id, {
      title: "Test",
      triggerType: "card_created",
    });
    const card = await pipesLib.createCard({
      pipeId,
      title: "Test Card",
      phaseId: "phase-1",
    });
    const run = await aiAgentsLib.createAgentRun(
      agent.id,
      behavior.id,
      card.id,
      "running",
    );
    const now = new Date();
    const updated = await aiAgentsLib.updateAgentRun(run.id, {
      status: "success",
      message: "Completed successfully",
      finishedAt: now,
    });
    expect(updated.status).toBe("success");
    expect(updated.message).toBe("Completed successfully");
  });
});
