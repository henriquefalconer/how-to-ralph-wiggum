import type {
  automationActionTypes,
  automationTriggerTypes,
} from "@/lib/db/schema";

// Client-safe automation constants — no `db`/`pg` import here, so client
// components (e.g. AutomationBuilder's trigger/action picker) can use these
// without pulling Postgres driver code into the browser bundle.

export type AutomationTriggerType = (typeof automationTriggerTypes)[number];
export type AutomationActionType = (typeof automationActionTypes)[number];

export const AUTOMATION_TRIGGER_TYPES: readonly AutomationTriggerType[] = [
  "card_entered_phase",
  "field_updated",
  "card_created",
  "recurring_activity",
  "alert_triggered",
  "card_exited_phase",
  "email_received",
  "connected_cards_moved_to_phase",
  "http_response_received",
  "interface_button_clicked",
];

export const AUTOMATION_ACTION_TYPES: readonly AutomationActionType[] = [
  "ask_ai",
  "send_task",
  "move_card",
  "update_field",
  "create_connected_record",
  "create_record",
  "move_parent_card",
  "distribute_assignees",
  "apply_formula",
  "http_request",
  "apply_sla_rules",
  "send_email_template",
];

export function isAutomationTriggerType(
  value: string,
): value is AutomationTriggerType {
  return (AUTOMATION_TRIGGER_TYPES as readonly string[]).includes(value);
}

export function isAutomationActionType(
  value: string,
): value is AutomationActionType {
  return (AUTOMATION_ACTION_TYPES as readonly string[]).includes(value);
}
