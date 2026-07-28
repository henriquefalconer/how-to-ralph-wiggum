import type { fieldOwnerTypes, fieldTypes } from "@/lib/db/schema";

// Client-safe field type constants and pure helpers — no `db`/`pg` import here,
// so client components (e.g. PhaseEditor's field palette) can use these without
// pulling Postgres driver code into the browser bundle.

export type FieldType = (typeof fieldTypes)[number];
export type FieldOwnerType = (typeof fieldOwnerTypes)[number];

export const FIELD_TYPES: readonly FieldType[] = [
  "assignee_select",
  "attachment",
  "checklist_horizontal",
  "checklist_vertical",
  "cnpj",
  "connector",
  "cpf",
  "currency",
  "date",
  "datetime",
  "due_date",
  "email",
  "id",
  "label_select",
  "long_text",
  "number",
  "phone",
  "radio_horizontal",
  "radio_vertical",
  "select",
  "short_text",
  "statement",
  "time",
];

// Types that render a fixed set of options and must be created with at least one.
const CHOICE_FIELD_TYPES: ReadonlySet<FieldType> = new Set([
  "select",
  "radio_horizontal",
  "radio_vertical",
  "checklist_horizontal",
  "checklist_vertical",
  "label_select",
]);

// Display-only types per the target product's docs — their value can never be written.
const READONLY_FIELD_TYPES: ReadonlySet<FieldType> = new Set([
  "id",
  "statement",
]);

export function isChoiceFieldType(type: FieldType): boolean {
  return CHOICE_FIELD_TYPES.has(type);
}

export function isFieldValueEditable(field: { type: FieldType }): boolean {
  return !READONLY_FIELD_TYPES.has(field.type);
}

// Lowercase, then collapse every run of non [a-z0-9] characters (accents included) into
// a single underscore — matches the target's slug generation observed live (e.g. "Fiéld" -> "fi_ld").
export function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// Masks raw digit entry into a currency amount, interpreting the digits as cents —
// matches the target's live "15000" -> "150.00" behavior for `currency` fields.
export function formatCurrencyInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const cents = Number.parseInt(digits, 10);
  return (cents / 100).toFixed(2);
}
