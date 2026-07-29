import { db } from "@/lib/db";
import {
  cardFieldValues,
  cards,
  interfaceElementTypes,
  interfacePageElements,
  interfacePages,
  interfacePrivacyTiers,
  interfaces,
  phases,
  pipes,
  tableRecordFieldValues,
  tableRecords,
  tables,
} from "@/lib/db/schema";
import { type Field, listFields } from "@/lib/fields";
import { asc, desc, eq, inArray } from "drizzle-orm";

export type Interface = typeof interfaces.$inferSelect;
export type InterfacePage = typeof interfacePages.$inferSelect;
export type InterfacePageElement = typeof interfacePageElements.$inferSelect;

export type InterfacePrivacyTier = (typeof interfacePrivacyTiers)[number];
export type InterfaceElementType = (typeof interfaceElementTypes)[number];

export const INTERFACE_PRIVACY_TIERS = interfacePrivacyTiers;
export const INTERFACE_ELEMENT_TYPES = interfaceElementTypes;

export const CURRENT_USER_TOKEN = "$CURRENT_USER";

export interface VisibilityCondition {
  fieldId: string;
  operator: "eq" | "neq";
  value: string;
}

export type DataSourceType = "pipe" | "database";

export interface DataTableConfig {
  sourceType: DataSourceType;
  sourceId: string;
  showTitle?: boolean;
  titleOverride?: string;
  clickableRows?: boolean;
  allowExport?: boolean;
  sortField?: string | null;
  sortDirection?: "asc" | "desc";
  visibilityConditions?: VisibilityCondition[];
}

export interface FormLinkConfig {
  sourceType: DataSourceType;
  sourceId: string;
  nameOverride?: string;
  descriptionOverride?: string;
}

// ---------- Interfaces ----------

export interface InterfaceInput {
  name: string;
  icon?: string;
  privacyTier?: InterfacePrivacyTier;
}

export async function listInterfaces(orgId: string): Promise<Interface[]> {
  return db
    .select()
    .from(interfaces)
    .where(eq(interfaces.orgId, orgId))
    .orderBy(asc(interfaces.createdAt));
}

export async function getInterface(id: string): Promise<Interface | null> {
  const [row] = await db.select().from(interfaces).where(eq(interfaces.id, id));
  return row ?? null;
}

export interface InterfaceWithFirstPage extends Interface {
  firstPageId: string | null;
}

export async function listInterfacesWithFirstPage(
  orgId: string,
): Promise<InterfaceWithFirstPage[]> {
  const rows = await listInterfaces(orgId);
  const firstPages = await Promise.all(
    rows.map(async (iface) => {
      const [page] = await db
        .select({ id: interfacePages.id })
        .from(interfacePages)
        .where(eq(interfacePages.interfaceId, iface.id))
        .orderBy(asc(interfacePages.position))
        .limit(1);
      return page?.id ?? null;
    }),
  );
  return rows.map((iface, index) => ({
    ...iface,
    firstPageId: firstPages[index],
  }));
}

function assertValidPrivacyTier(
  tier: string,
): asserts tier is InterfacePrivacyTier {
  if (!(interfacePrivacyTiers as readonly string[]).includes(tier)) {
    throw new Error(`Unknown privacy tier: ${tier}`);
  }
}

export async function createInterface(
  orgId: string,
  input: InterfaceInput,
  firstPageName: string,
): Promise<{ iface: Interface; page: InterfacePage }> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Interface name is required");
  }
  if (input.privacyTier) {
    assertValidPrivacyTier(input.privacyTier);
  }

  const [iface] = await db
    .insert(interfaces)
    .values({
      orgId,
      name,
      icon: input.icon?.trim() || "Layout",
      privacyTier: input.privacyTier ?? "restricted_org",
    })
    .returning();

  const [page] = await db
    .insert(interfacePages)
    .values({ interfaceId: iface.id, name: firstPageName, position: 0 })
    .returning();

  return { iface, page };
}

export async function updateInterface(
  id: string,
  input: Partial<InterfaceInput>,
): Promise<Interface> {
  if (input.name !== undefined && !input.name.trim()) {
    throw new Error("Interface name is required");
  }
  if (input.privacyTier) {
    assertValidPrivacyTier(input.privacyTier);
  }

  const [updated] = await db
    .update(interfaces)
    .set({
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      ...(input.privacyTier !== undefined
        ? { privacyTier: input.privacyTier }
        : {}),
    })
    .where(eq(interfaces.id, id))
    .returning();

  if (!updated) {
    throw new Error("Interface not found");
  }
  return updated;
}

// ---------- Pages ----------

export async function listPages(interfaceId: string): Promise<InterfacePage[]> {
  return db
    .select()
    .from(interfacePages)
    .where(eq(interfacePages.interfaceId, interfaceId))
    .orderBy(asc(interfacePages.position));
}

export async function getPage(pageId: string): Promise<InterfacePage | null> {
  const [row] = await db
    .select()
    .from(interfacePages)
    .where(eq(interfacePages.id, pageId));
  return row ?? null;
}

export async function createPage(
  interfaceId: string,
  name: string,
): Promise<InterfacePage> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Page name is required");
  }
  const existing = await listPages(interfaceId);
  const [page] = await db
    .insert(interfacePages)
    .values({ interfaceId, name: trimmed, position: existing.length })
    .returning();
  return page;
}

export interface PageUpdateInput {
  name?: string;
  showHeader?: boolean;
}

export async function updatePage(
  pageId: string,
  input: PageUpdateInput,
): Promise<InterfacePage> {
  if (input.name !== undefined && !input.name.trim()) {
    throw new Error("Page name is required");
  }

  const [updated] = await db
    .update(interfacePages)
    .set({
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.showHeader !== undefined
        ? { showHeader: input.showHeader }
        : {}),
    })
    .where(eq(interfacePages.id, pageId))
    .returning();

  if (!updated) {
    throw new Error("Page not found");
  }
  return updated;
}

// ---------- Elements ----------

export async function listElements(
  pageId: string,
): Promise<InterfacePageElement[]> {
  return db
    .select()
    .from(interfacePageElements)
    .where(eq(interfacePageElements.pageId, pageId))
    .orderBy(asc(interfacePageElements.position));
}

export async function getElement(
  elementId: string,
): Promise<InterfacePageElement | null> {
  const [row] = await db
    .select()
    .from(interfacePageElements)
    .where(eq(interfacePageElements.id, elementId));
  return row ?? null;
}

export async function createElement(
  pageId: string,
  type: InterfaceElementType,
  config: Record<string, unknown> = {},
): Promise<InterfacePageElement> {
  if (!(interfaceElementTypes as readonly string[]).includes(type)) {
    throw new Error(`Unknown element type: ${type}`);
  }
  const existing = await listElements(pageId);
  const [element] = await db
    .insert(interfacePageElements)
    .values({ pageId, type, config, position: existing.length })
    .returning();
  return element;
}

export async function updateElementConfig(
  elementId: string,
  config: Record<string, unknown>,
): Promise<InterfacePageElement> {
  const [updated] = await db
    .update(interfacePageElements)
    .set({ config })
    .where(eq(interfacePageElements.id, elementId))
    .returning();
  if (!updated) {
    throw new Error("Element not found");
  }
  return updated;
}

export async function deleteElement(elementId: string): Promise<void> {
  const remaining = await db
    .delete(interfacePageElements)
    .where(eq(interfacePageElements.id, elementId))
    .returning({ id: interfacePageElements.id });
  if (remaining.length === 0) {
    throw new Error("Element not found");
  }
}

/**
 * Persists a full reorder as explicit `position` values (0..n-1) rather than
 * relying on row insertion order — the element list must survive drag
 * reordering across sessions.
 */
export async function reorderElements(
  pageId: string,
  orderedIds: string[],
): Promise<InterfacePageElement[]> {
  const existing = await listElements(pageId);
  const existingIds = new Set(existing.map((e) => e.id));
  const sameSet =
    orderedIds.length === existing.length &&
    orderedIds.every((id) => existingIds.has(id));
  if (!sameSet) {
    throw new Error("orderedIds must match this page's element set exactly");
  }

  await Promise.all(
    orderedIds.map((id, index) =>
      db
        .update(interfacePageElements)
        .set({ position: index })
        .where(eq(interfacePageElements.id, id)),
    ),
  );

  return listElements(pageId);
}

// ---------- Access control ----------

/**
 * Pure gate for the 3-tier privacy model. Not wired to route access — this
 * clone has no login wall (out of scope), so it's exercised directly by
 * callers that already know who the viewer is.
 */
export function canViewInterface(
  privacyTier: InterfacePrivacyTier,
  viewer: { personId: string | null; isOrgMember: boolean },
  sharedPersonIds: string[],
): boolean {
  switch (privacyTier) {
    case "public_link":
      return true;
    case "restricted_org":
      return viewer.isOrgMember;
    case "restricted_people":
      return (
        viewer.personId !== null && sharedPersonIds.includes(viewer.personId)
      );
    default:
      return false;
  }
}

/**
 * Substitutes $CURRENT_USER with the actual viewer id at call time, so the
 * same saved condition resolves differently per viewer instead of baking in
 * whoever authored the element.
 */
export function filterRowsByVisibilityConditions<
  T extends { values: Record<string, string> },
>(rows: T[], conditions: VisibilityCondition[], viewerId: string): T[] {
  if (!conditions || conditions.length === 0) return rows;
  return rows.filter((row) =>
    conditions.every((condition) => {
      const expected =
        condition.value === CURRENT_USER_TOKEN ? viewerId : condition.value;
      const actual = row.values[condition.fieldId] ?? "";
      return condition.operator === "neq"
        ? actual !== expected
        : actual === expected;
    }),
  );
}

// ---------- Data widget (Dados) ----------

export interface DataTableRow {
  id: string;
  title: string;
  values: Record<string, string>;
}

export interface DataTableResult {
  rows: DataTableRow[];
  total: number;
}

async function rowsForPipeSource(pipeId: string): Promise<DataTableRow[]> {
  const [pipe] = await db.select().from(pipes).where(eq(pipes.id, pipeId));
  if (!pipe) {
    throw new Error("Pipe not found");
  }

  const pipeCards = await db
    .select()
    .from(cards)
    .where(eq(cards.pipeId, pipeId))
    .orderBy(desc(cards.createdAt));
  if (pipeCards.length === 0) return [];

  const cardIds = pipeCards.map((c) => c.id);
  const allValues = await db
    .select()
    .from(cardFieldValues)
    .where(inArray(cardFieldValues.cardId, cardIds));

  const valuesByCard = new Map<string, Record<string, string>>();
  for (const v of allValues) {
    const bucket = valuesByCard.get(v.cardId) ?? {};
    bucket[v.fieldId] = v.value;
    valuesByCard.set(v.cardId, bucket);
  }

  return pipeCards.map((c) => ({
    id: c.id,
    title: c.title,
    values: valuesByCard.get(c.id) ?? {},
  }));
}

async function rowsForDatabaseSource(tableId: string): Promise<DataTableRow[]> {
  const [table] = await db.select().from(tables).where(eq(tables.id, tableId));
  if (!table) {
    throw new Error("Database not found");
  }

  const records = await db
    .select()
    .from(tableRecords)
    .where(eq(tableRecords.tableId, tableId))
    .orderBy(desc(tableRecords.createdAt));
  if (records.length === 0) return [];

  const recordIds = records.map((r) => r.id);
  const allValues = await db
    .select()
    .from(tableRecordFieldValues)
    .where(inArray(tableRecordFieldValues.recordId, recordIds));

  const valuesByRecord = new Map<string, Record<string, string>>();
  for (const v of allValues) {
    const bucket = valuesByRecord.get(v.recordId) ?? {};
    bucket[v.fieldId] = v.value;
    valuesByRecord.set(v.recordId, bucket);
  }

  return records.map((r) => {
    const values = valuesByRecord.get(r.id) ?? {};
    return {
      id: r.id,
      title: table.titleFieldId ? (values[table.titleFieldId] ?? "") : "",
      values,
    };
  });
}

export async function getDataTableRows(
  config: DataTableConfig,
  viewerId: string,
): Promise<DataTableResult> {
  const rows =
    config.sourceType === "pipe"
      ? await rowsForPipeSource(config.sourceId)
      : await rowsForDatabaseSource(config.sourceId);

  const filtered = filterRowsByVisibilityConditions(
    rows,
    config.visibilityConditions ?? [],
    viewerId,
  );

  const sortField = config.sortField;
  const sorted = sortField
    ? [...filtered].sort((a, b) => {
        const cmp = (a.values[sortField] ?? "").localeCompare(
          b.values[sortField] ?? "",
        );
        return config.sortDirection === "desc" ? -cmp : cmp;
      })
    : filtered;

  return { rows: sorted, total: sorted.length };
}

/** First assignee_select field on a pipe (start form, then phases) — backs the
 * "Atribuido ao visualizador" one-click visibility preset. */
export async function findAssigneeFieldId(
  pipeId: string,
): Promise<string | null> {
  const startFormFields = await listFields("start_form", pipeId);
  const startFormAssignee = startFormFields.find(
    (f) => f.type === "assignee_select",
  );
  if (startFormAssignee) return startFormAssignee.id;

  const pipePhases = await db
    .select()
    .from(phases)
    .where(eq(phases.pipeId, pipeId));
  for (const phase of pipePhases) {
    const phaseFields = await listFields("phase", phase.id);
    const assignee = phaseFields.find((f) => f.type === "assignee_select");
    if (assignee) return assignee.id;
  }
  return null;
}

// ---------- Form widget (Formularios) ----------

export interface FormLinkTarget {
  pipeId: string;
  pipeName: string;
  phaseId: string;
  fields: Field[];
}

export async function getFormLinkTarget(
  pipeId: string,
): Promise<FormLinkTarget | null> {
  const [pipe] = await db.select().from(pipes).where(eq(pipes.id, pipeId));
  if (!pipe) return null;

  const pipePhases = await db
    .select()
    .from(phases)
    .where(eq(phases.pipeId, pipeId))
    .orderBy(asc(phases.position));
  const targetPhase =
    pipePhases.find((p) => p.allowCardCreation) ?? pipePhases[0];
  if (!targetPhase) return null;

  const startFormFields = await listFields("start_form", pipeId);

  return {
    pipeId: pipe.id,
    pipeName: pipe.name,
    phaseId: targetPhase.id,
    fields: startFormFields,
  };
}

// ---------- Content elements (Texto, Link, Divisor) ----------

export interface TextElementConfig {
  content?: string; // Rich text with optional {{token}} refs
}

export interface LinkElementConfig {
  name?: string;
  url?: string;
}

export interface DividerElementConfig {
  // Divider has no config
}

/**
 * Renders rich text content with dynamic-field token substitution.
 * Tokens are in the form {{fieldId}} or {{card.title}}.
 * @param content Plain or rich text with embedded {{token}} refs
 * @param context Object with field values (fieldId -> value mapping)
 * @returns Rendered text with tokens substituted
 */
export function renderTextContent(
  content: string | undefined,
  context: Record<string, string>,
): string {
  if (!content) return "";

  return content.replace(
    /\{\{([a-z_]+(?:\.[a-z_]+)*)\}\}/gi,
    (match, token) => {
      // Simple token resolution: {{card.title}} or {{fieldId}}
      const parts = token.split(".");
      let value: unknown = context;
      for (const part of parts) {
        if (typeof value === "object" && value !== null) {
          value = (value as Record<string, unknown>)[part];
        } else {
          return match; // Token not found, leave as-is
        }
      }
      return String(value ?? match);
    },
  );
}

/**
 * Validates a Link element's config (name and url).
 * A link with no URL should not be considered broken — it's just unconfigured.
 * @returns true if the link has both name and url, false otherwise
 */
export function isLinkConfigComplete(config: LinkElementConfig): boolean {
  return Boolean(config.name?.trim() && config.url?.trim());
}

/**
 * A Divisor element is always complete — it has no required fields.
 */
export function isDividerComplete(): boolean {
  return true;
}

// ---------- Media elements (Imagem, Vídeo, Incorporar) ----------

export interface ImageElementConfig {
  sourceType?: "unsplash" | "upload" | "url"; // unsplash photo id, upload file_id, or raw URL
  sourceRef?: string; // unsplash photo id, upload file_id, or raw URL
  altText?: string; // Texto alternativo
  roundedCorners?: boolean; // Cantos arredondados toggle
}

export interface VideoElementConfig {
  url?: string; // Must be YouTube or Vimeo
  platform?: "youtube" | "vimeo"; // Derived from url
  showControls?: boolean; // Mostrar Controles toggle
}

export interface EmbedElementConfig {
  url?: string; // Arbitrary iframe URL
  showNavControls?: boolean; // Mostrar controles de navegação (default true)
  showTitleBar?: boolean; // Mostrar título/url (default true)
}

/**
 * Validates that a video URL is from an acceptable platform (YouTube or Vimeo).
 * Per the target product's restriction: "Somente vídeos do YouTube, Vimeo são suportados por enquanto"
 */
export function isValidVideoUrl(url: string | undefined): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes("youtube.com") ||
    lower.includes("youtu.be") ||
    lower.includes("vimeo.com")
  );
}

/**
 * Extracts a display title/domain from an arbitrary embed URL.
 * Returns the domain name (without www prefix), or empty string for invalid URLs.
 * In real usage, could fetch og:title; this default approach uses domain only.
 */
export function extractEmbedTitle(url: string | undefined): string {
  if (!url) return "";
  try {
    const urlObj = new URL(url);
    let host = urlObj.hostname || "";
    if (host.startsWith("www.")) {
      host = host.slice(4);
    }
    return host;
  } catch {
    return "";
  }
}
