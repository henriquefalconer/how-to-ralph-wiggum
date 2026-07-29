import { db } from "@/lib/db";
import {
  cards,
  emailMessages,
  emailTemplates,
  emailThreads,
  pipes,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function createEmailThread(cardId: string, pipeId: string) {
  const result = await db
    .insert(emailThreads)
    .values({ cardId, pipeId })
    .returning();
  return result[0];
}

export async function getEmailThread(threadId: string) {
  const result = await db.query.emailThreads.findFirst({
    where: eq(emailThreads.id, threadId),
  });
  return result;
}

export async function listEmailThreads(cardId: string) {
  const result = await db.query.emailThreads.findMany({
    where: eq(emailThreads.cardId, cardId),
    orderBy: (t) => t.createdAt,
  });
  return result;
}

export async function createEmailMessage(
  threadId: string,
  data: {
    direction: "inbound" | "outbound";
    fromName: string;
    fromAddress: string;
    toAddresses: string[];
    ccAddresses?: string[];
    bccAddresses?: string[];
    subject: string;
    bodyHtml: string;
    sentAt?: Date;
    assigneeId?: string;
    dueDate?: Date;
    labelIds?: string[];
  },
) {
  const result = await db
    .insert(emailMessages)
    .values({
      threadId,
      direction: data.direction,
      fromName: data.fromName,
      fromAddress: data.fromAddress,
      toAddresses: data.toAddresses,
      ccAddresses: data.ccAddresses ?? [],
      bccAddresses: data.bccAddresses ?? [],
      subject: data.subject,
      bodyHtml: data.bodyHtml,
      sentAt: data.sentAt,
      assigneeId: data.assigneeId,
      dueDate: data.dueDate,
      labelIds: data.labelIds ?? [],
    })
    .returning();
  return result[0];
}

export async function listEmailMessages(threadId: string) {
  const result = await db.query.emailMessages.findMany({
    where: eq(emailMessages.threadId, threadId),
    orderBy: (m) => m.createdAt,
  });
  return result;
}

export async function markEmailMessageRead(messageId: string) {
  const result = await db
    .update(emailMessages)
    .set({ read: true })
    .where(eq(emailMessages.id, messageId))
    .returning();
  return result[0];
}

export async function createEmailTemplate(
  pipeId: string,
  data: {
    name: string;
    senderName: string;
    senderEmail?: string;
    useCustomSenderAddress?: boolean;
    defaultToAddresses?: string[];
    defaultCcAddresses?: string[];
    defaultBccAddresses?: string[];
    defaultSubject: string;
    bodyHtml: string;
  },
) {
  const result = await db
    .insert(emailTemplates)
    .values({
      pipeId,
      name: data.name,
      senderName: data.senderName,
      senderEmail: data.senderEmail,
      useCustomSenderAddress: data.useCustomSenderAddress ?? false,
      defaultToAddresses: data.defaultToAddresses ?? [],
      defaultCcAddresses: data.defaultCcAddresses ?? [],
      defaultBccAddresses: data.defaultBccAddresses ?? [],
      defaultSubject: data.defaultSubject,
      bodyHtml: data.bodyHtml,
    })
    .returning();
  return result[0];
}

export async function listEmailTemplates(pipeId: string) {
  const result = await db.query.emailTemplates.findMany({
    where: eq(emailTemplates.pipeId, pipeId),
    orderBy: (t) => t.createdAt,
  });
  return result;
}

export async function getEmailTemplate(templateId: string) {
  const result = await db.query.emailTemplates.findFirst({
    where: eq(emailTemplates.id, templateId),
  });
  return result;
}

export async function updateEmailTemplate(
  templateId: string,
  data: Partial<{
    name: string;
    senderName: string;
    senderEmail: string;
    useCustomSenderAddress: boolean;
    defaultToAddresses: string[];
    defaultCcAddresses: string[];
    defaultBccAddresses: string[];
    defaultSubject: string;
    bodyHtml: string;
  }>,
) {
  const result = await db
    .update(emailTemplates)
    .set(data)
    .where(eq(emailTemplates.id, templateId))
    .returning();
  return result[0];
}

export async function deleteEmailTemplate(templateId: string) {
  await db.delete(emailTemplates).where(eq(emailTemplates.id, templateId));
}

export function generateThreadAlias(pipeId: string, threadId: string) {
  const token = threadId.slice(0, 8);
  return `pipe${pipeId.slice(0, 8)}+${token}@mail.pipefy.com`;
}

export function generateInboundAlias(pipeId: string) {
  return `pipe${pipeId.slice(0, 8)}@mail.pipefy.com`;
}

export function interpolateEmailTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{\{(.+?)\}\}/g, (match, key) => {
    return values[key] ?? match;
  });
}

export function extractTemplateTokens(template: string): string[] {
  const matches = template.match(/\{\{(.+?)\}\}/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(2, -2)))];
}
