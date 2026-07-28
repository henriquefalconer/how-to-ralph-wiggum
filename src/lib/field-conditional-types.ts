// Client-safe field-conditional constants and pure evaluation logic — no
// `db`/`pg` import here, so client components (e.g. the phase field-fill
// form) can re-evaluate visibility on every keystroke without pulling
// Postgres driver code into the browser bundle.

export const FIELD_CONDITIONAL_OPERATORS = [
  "equals",
  "not_equals",
  "contains",
  "is_empty",
  "is_not_empty",
] as const;

export type ConditionalOperator = (typeof FIELD_CONDITIONAL_OPERATORS)[number];

// Only "Ocultar" (hide) was observed live in the target product; "show" is
// the natural mirror for the false-branch/toggle-back case. See prd.json's
// `behavior` note for feature-009 — the full action-type list (beyond
// show/hide) is unverified.
export const FIELD_CONDITIONAL_ACTIONS = ["hide", "show"] as const;

export type ConditionalActionType = (typeof FIELD_CONDITIONAL_ACTIONS)[number];

export interface ConditionCheck {
  fieldId: string;
  operator: ConditionalOperator;
  value: string;
}

export type ConditionGroup = ConditionCheck[];

export interface ConditionalAction {
  action: ConditionalActionType;
  targetFieldId: string;
}

export interface FieldConditionalRule {
  position: number;
  conditionGroups: ConditionGroup[];
  trueActions: ConditionalAction[];
  falseActions: ConditionalAction[];
}

export function isConditionalOperator(
  value: string,
): value is ConditionalOperator {
  return (FIELD_CONDITIONAL_OPERATORS as readonly string[]).includes(value);
}

export function isConditionalActionType(
  value: string,
): value is ConditionalActionType {
  return (FIELD_CONDITIONAL_ACTIONS as readonly string[]).includes(value);
}

function evaluateCheck(
  check: ConditionCheck,
  values: Record<string, string>,
): boolean {
  const actual = (values[check.fieldId] ?? "").trim();
  const expected = check.value.trim();
  switch (check.operator) {
    case "equals":
      return actual === expected;
    case "not_equals":
      return actual !== expected;
    case "contains":
      return actual.includes(expected);
    case "is_empty":
      return actual === "";
    case "is_not_empty":
      return actual !== "";
    default:
      return false;
  }
}

/**
 * AND within a group (every check in the group must pass), OR across groups
 * (any single group passing is enough to trigger the conditional). An empty
 * group list never triggers.
 */
export function conditionGroupsMatch(
  groups: ConditionGroup[],
  values: Record<string, string>,
): boolean {
  if (groups.length === 0) return false;
  return groups.some(
    (group) =>
      group.length > 0 && group.every((check) => evaluateCheck(check, values)),
  );
}

/**
 * Evaluates every rule in ascending `position` order and folds each one's
 * resulting actions into a single fieldId -> action map. Rules are
 * processed top-to-bottom, so a later rule targeting the same field
 * overwrites an earlier one's action (last one wins on conflict).
 */
export function evaluateConditionals(
  rules: FieldConditionalRule[],
  values: Record<string, string>,
): Record<string, ConditionalActionType> {
  const result: Record<string, ConditionalActionType> = {};
  const ordered = [...rules].sort((a, b) => a.position - b.position);
  for (const rule of ordered) {
    const triggered = conditionGroupsMatch(rule.conditionGroups, values);
    const actions = triggered ? rule.trueActions : rule.falseActions;
    for (const action of actions) {
      result[action.targetFieldId] = action.action;
    }
  }
  return result;
}
