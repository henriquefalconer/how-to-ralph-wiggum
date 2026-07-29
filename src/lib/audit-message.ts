import type {
  auditLogCategories,
  auditLogResourceTypes,
} from "@/lib/db/schema";
import type { Dictionary } from "@/lib/i18n";

export type AuditLogCategory = (typeof auditLogCategories)[number];
export type AuditLogResourceType = (typeof auditLogResourceTypes)[number];
export type AuditMessageKey = keyof Dictionary["auditLog"]["messages"];

// A rendered, transport-safe view of an audit entry: what the dashboard, the
// REST API and the CSV export all consume. Keeping the renderer free of any
// database import lets client components re-render entries in their own locale.
export interface AuditLogEntryView {
  id: string;
  category: AuditLogCategory;
  resourceType: AuditLogResourceType;
  actorName: string;
  actorEmail: string;
  messageKey: string;
  messageParams: Record<string, string>;
  occurredAt: string;
}

// Which generalSettings dictionary key names each pipe setting the audit log
// can report on. Keeps the setting names localised without duplicating the
// labels the settings page already ships.
export const AUDITED_PIPE_SETTINGS: Record<
  string,
  keyof Dictionary["generalSettings"]
> = {
  name: "nameLabel",
  icon: "iconLabel",
  tags: "tagsLabel",
  itemName: "itemNameLabel",
  createCardButtonLabel: "createButtonLabelLabel",
  defaultView: "defaultViewLabel",
  titleFieldId: "titleFieldLabel",
  kanbanPreviewFieldIds: "kanbanPreviewFieldsLabel",
  connectedCardFieldIds: "connectedCardFieldsLabel",
  expirationAlertTime: "expirationTimeLabel",
  expirationAlertUnit: "expirationUnitLabel",
  expirationAlertBusinessDaysOnly: "businessDaysOnlyLabel",
  visibility: "visibilityLabel",
  aiAgentsEnabled: "aiAgentsLabel",
  aiCopilotEnabled: "aiCopilotLabel",
  allowBulkActions: "allowBulkActionsLabel",
  restrictEditToAssignee: "restrictEditToAssigneeLabel",
  restrictDeleteToAdmin: "restrictDeleteToAdminLabel",
};

// Stored values that are enum keys rather than free text, so the log can render
// them in the reader's locale instead of echoing the database value.
const ENUM_VALUE_LABEL_KEYS: Record<
  string,
  keyof Dictionary["generalSettings"]
> = {
  kanban: "defaultViewKanban",
  list: "defaultViewList",
  minutes: "expirationUnitMinutes",
  hours: "expirationUnitHours",
  days: "expirationUnitDays",
  org_open: "visibilityOrgOpen",
  invite_only: "visibilityInviteOnly",
};

// Settings whose stored from/to values are enum keys or booleans rather than
// user-entered text, and so are localised at render time.
const BOOLEAN_SETTINGS = new Set([
  "expirationAlertBusinessDaysOnly",
  "aiAgentsEnabled",
  "aiCopilotEnabled",
  "allowBulkActions",
  "restrictEditToAssignee",
  "restrictDeleteToAdmin",
]);

const ENUM_SETTINGS = new Set([
  "defaultView",
  "expirationAlertUnit",
  "visibility",
]);

function resolveParamValue(
  key: string,
  value: string,
  params: Record<string, string>,
  dictionary: Dictionary,
): string {
  if (key === "setting") {
    const labelKey = AUDITED_PIPE_SETTINGS[value];
    return labelKey ? dictionary.generalSettings[labelKey] : value;
  }
  if (key === "trigger") {
    const label =
      dictionary.automations.builder.triggers[
        value as keyof Dictionary["automations"]["builder"]["triggers"]
      ];
    return label ?? value;
  }
  if (key === "action") {
    const label =
      dictionary.automations.builder.actions[
        value as keyof Dictionary["automations"]["builder"]["actions"]
      ];
    return label ?? value;
  }
  if ((key === "from" || key === "to") && params.setting) {
    if (BOOLEAN_SETTINGS.has(params.setting)) {
      return value === "true"
        ? dictionary.auditLog.valueOn
        : dictionary.auditLog.valueOff;
    }
    if (ENUM_SETTINGS.has(params.setting)) {
      const enumKey = ENUM_VALUE_LABEL_KEYS[value];
      return enumKey ? dictionary.generalSettings[enumKey] : value;
    }
  }
  return value;
}

export function renderAuditMessage(
  entry: Pick<AuditLogEntryView, "messageKey" | "messageParams">,
  dictionary: Dictionary,
): string {
  const template =
    dictionary.auditLog.messages[entry.messageKey as AuditMessageKey] ??
    entry.messageKey;

  let rendered = template;
  for (const [key, raw] of Object.entries(entry.messageParams)) {
    rendered = rendered.replaceAll(
      `{${key}}`,
      resolveParamValue(key, raw, entry.messageParams, dictionary),
    );
  }
  // A resolved value may itself carry the "{org}" placeholder (the
  // "Open to {org}" visibility label does); fill it from the params.
  return rendered.replaceAll("{org}", entry.messageParams.org ?? "");
}
