import { db } from "@/lib/db";
import {
  aiAgents,
  aiAgentBehaviors,
  aiAgentKnowledgeSources,
  aiAgentRuns,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function createAgent(pipeId: string, name?: string) {
  const agent = await db
    .insert(aiAgents)
    .values({
      pipeId,
      name: name || "Agente sem título",
      description: "",
      status: "draft",
    })
    .returning();
  return agent[0];
}

export async function getAgent(agentId: string) {
  const agent = await db.query.aiAgents.findFirst({
    where: eq(aiAgents.id, agentId),
  });
  return agent;
}

export async function listAgents(pipeId: string) {
  const agents = await db.query.aiAgents.findMany({
    where: eq(aiAgents.pipeId, pipeId),
    orderBy: desc(aiAgents.createdAt),
  });
  return agents;
}

export async function updateAgent(
  agentId: string,
  updates: {
    name?: string;
    description?: string;
    status?: "draft" | "active" | "inactive";
  },
) {
  const result = await db
    .update(aiAgents)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(aiAgents.id, agentId))
    .returning();
  return result[0];
}

export async function deleteAgent(agentId: string) {
  await db.delete(aiAgents).where(eq(aiAgents.id, agentId));
}

export async function createBehavior(
  agentId: string,
  data: {
    title: string;
    triggerType: "card_entered_phase" | "field_updated" | "card_created" | "alert_triggered" | "card_exited_phase" | "email_received" | "connected_cards_moved_to_phase" | "http_response_received" | "interface_button_clicked";
    triggerConfig?: Record<string, unknown>;
    instructions?: string;
    modelTier?: "org_default" | "classic" | "lite" | "pro" | "standard";
    skills?: Record<string, boolean>;
    effort?: "standard" | "maximum";
  },
) {
  const behavior = await db
    .insert(aiAgentBehaviors)
    .values({
      agentId,
      title: data.title,
      enabled: true,
      triggerType: data.triggerType,
      triggerConfig: data.triggerConfig || {},
      instructions: data.instructions || "",
      modelTier: data.modelTier || "org_default",
      skills: data.skills || {},
      effort: data.effort || "standard",
    })
    .returning();
  return behavior[0];
}

export async function getBehavior(behaviorId: string) {
  const behavior = await db.query.aiAgentBehaviors.findFirst({
    where: eq(aiAgentBehaviors.id, behaviorId),
  });
  return behavior;
}

export async function listBehaviors(agentId: string) {
  const behaviors = await db.query.aiAgentBehaviors.findMany({
    where: eq(aiAgentBehaviors.agentId, agentId),
    orderBy: desc(aiAgentBehaviors.createdAt),
  });
  return behaviors;
}

export async function updateBehavior(
  behaviorId: string,
  updates: {
    title?: string;
    enabled?: boolean;
    triggerType?: "card_entered_phase" | "field_updated" | "card_created" | "alert_triggered" | "card_exited_phase" | "email_received" | "connected_cards_moved_to_phase" | "http_response_received" | "interface_button_clicked";
    triggerConfig?: Record<string, unknown>;
    instructions?: string;
    modelTier?: "org_default" | "classic" | "lite" | "pro" | "standard";
    skills?: Record<string, boolean>;
    effort?: "standard" | "maximum";
  },
) {
  const result = await db
    .update(aiAgentBehaviors)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(aiAgentBehaviors.id, behaviorId))
    .returning();
  return result[0];
}

export async function deleteBehavior(behaviorId: string) {
  await db.delete(aiAgentBehaviors).where(eq(aiAgentBehaviors.id, behaviorId));
}

export async function createKnowledgeSource(
  agentId: string,
  data: {
    type: "document" | "pipe_database" | "plain_text";
    name: string;
    usageDescription?: string;
    content?: string;
    fileRef?: string;
    sourcePipeId?: string;
  },
) {
  const source = await db
    .insert(aiAgentKnowledgeSources)
    .values({
      agentId,
      type: data.type,
      name: data.name,
      usageDescription: data.usageDescription || "",
      content: data.content,
      fileRef: data.fileRef,
      sourcePipeId: data.sourcePipeId,
    })
    .returning();
  return source[0];
}

export async function listKnowledgeSources(agentId: string) {
  const sources = await db.query.aiAgentKnowledgeSources.findMany({
    where: eq(aiAgentKnowledgeSources.agentId, agentId),
  });
  return sources;
}

export async function deleteKnowledgeSource(sourceId: string) {
  await db
    .delete(aiAgentKnowledgeSources)
    .where(eq(aiAgentKnowledgeSources.id, sourceId));
}

export async function createAgentRun(
  agentId: string,
  behaviorId: string,
  cardId: string,
  status: "success" | "error" | "running",
  message?: string,
) {
  const run = await db
    .insert(aiAgentRuns)
    .values({
      agentId,
      behaviorId,
      cardId,
      status,
      message: message || "",
    })
    .returning();
  return run[0];
}

export async function getAgentRun(runId: string) {
  const run = await db.query.aiAgentRuns.findFirst({
    where: eq(aiAgentRuns.id, runId),
  });
  return run;
}

export async function listAgentRuns(agentId: string) {
  const runs = await db.query.aiAgentRuns.findMany({
    where: eq(aiAgentRuns.agentId, agentId),
    orderBy: desc(aiAgentRuns.startedAt),
  });
  return runs;
}

export async function listBehaviorRuns(behaviorId: string) {
  const runs = await db.query.aiAgentRuns.findMany({
    where: eq(aiAgentRuns.behaviorId, behaviorId),
    orderBy: desc(aiAgentRuns.startedAt),
  });
  return runs;
}

export async function updateAgentRun(
  runId: string,
  updates: {
    status?: "success" | "error" | "running";
    message?: string;
    finishedAt?: Date;
  },
) {
  const result = await db
    .update(aiAgentRuns)
    .set(updates)
    .where(eq(aiAgentRuns.id, runId))
    .returning();
  return result[0];
}
