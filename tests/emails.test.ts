import {
  extractTemplateTokens,
  generateInboundAlias,
  generateThreadAlias,
  interpolateEmailTemplate,
} from "@/lib/emails";
import { describe, expect, it } from "vitest";

describe("Email utilities", () => {
  it("generates unique thread aliases based on pipe and thread IDs", () => {
    const pipeId = "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6";
    const threadId = "f1a2b3c4-d5e6-f7g8-h9i0-j1k2l3m4n5o6";
    const alias = generateThreadAlias(pipeId, threadId);
    expect(alias).toBe("pipea1b2c3d4+f1a2b3c4@mail.pipefy.com");
  });

  it("generates consistent inbound aliases for a pipe", () => {
    const pipeId = "12345678-abcd-efgh-ijkl-mnopqrstuvwx";
    const alias = generateInboundAlias(pipeId);
    expect(alias).toBe("pipe12345678@mail.pipefy.com");
  });

  it("interpolates single-level tokens in templates", () => {
    const template = "Dear {{card.title}}, your request is being processed.";
    const values = { "card.title": "Purchase Order #123" };
    const result = interpolateEmailTemplate(template, values);
    expect(result).toBe(
      "Dear Purchase Order #123, your request is being processed.",
    );
  });

  it("handles multiple tokens in one template", () => {
    const template = "From {{sender}} to {{recipient}} re: {{subject}}";
    const values = {
      sender: "John",
      recipient: "Jane",
      subject: "Status Update",
    };
    const result = interpolateEmailTemplate(template, values);
    expect(result).toBe("From John to Jane re: Status Update");
  });

  it("leaves unmatched tokens unchanged", () => {
    const template = "Hello {{name}}, {{undefined}} is not available";
    const values = { name: "Alice" };
    const result = interpolateEmailTemplate(template, values);
    expect(result).toBe("Hello Alice, {{undefined}} is not available");
  });

  it("extracts unique tokens from a template", () => {
    const template = "Hi {{card.title}}, {{card.title}} is ready";
    const tokens = extractTemplateTokens(template);
    expect(tokens).toEqual(["card.title"]);
  });

  it("extracts multiple unique tokens", () => {
    const template = "To {{recipient}}, from {{sender}}, about {{subject}}";
    const tokens = extractTemplateTokens(template);
    expect(tokens.sort()).toEqual(["recipient", "sender", "subject"].sort());
  });

  it("returns empty array for templates with no tokens", () => {
    const template = "This is plain text with no tokens";
    const tokens = extractTemplateTokens(template);
    expect(tokens).toEqual([]);
  });

  it("handles nested braces correctly (extracts innermost content)", () => {
    const template = "Value: {{data.nested}}";
    const tokens = extractTemplateTokens(template);
    expect(tokens).toEqual(["data.nested"]);
  });
});
