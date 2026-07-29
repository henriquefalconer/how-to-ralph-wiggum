"use client";

import type { Field } from "@/lib/fields";
import type { Dictionary } from "@/lib/i18n";
import {
  PIPE_ICONS,
  type Pipe,
  type PipeDefaultView,
  type PipeExpirationAlertUnit,
  type PipeVisibility,
} from "@/lib/pipes";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

const CONNECTED_CARD_FIELD_OPTIONS = ["created_at", "current_phase"] as const;
const MAX_TAGS = 3;

export function GeneralSettingsPage({
  pipe,
  orgName,
  startFormFields,
  dictionary,
}: {
  pipe: Pipe;
  orgName: string;
  startFormFields: Field[];
  dictionary: Dictionary;
}) {
  const d = dictionary.generalSettings;
  const attrLabels = dictionary.reports.builder.cardAttributes;

  const [icon, setIcon] = useState(pipe.icon ?? PIPE_ICONS[0]);
  const [name, setName] = useState(pipe.name);
  const [tags, setTags] = useState<string[]>(pipe.tags);
  const [tagDraft, setTagDraft] = useState("");
  const [itemName, setItemName] = useState(pipe.itemName ?? "");
  const [createCardButtonLabel, setCreateCardButtonLabel] = useState(
    pipe.createCardButtonLabel ?? "",
  );
  const [defaultView, setDefaultView] = useState<PipeDefaultView>(
    pipe.defaultView as PipeDefaultView,
  );
  const [titleFieldId, setTitleFieldId] = useState(pipe.titleFieldId ?? "");
  const [kanbanPreviewFieldIds, setKanbanPreviewFieldIds] = useState<string[]>(
    pipe.kanbanPreviewFieldIds,
  );
  const [connectedCardFieldIds, setConnectedCardFieldIds] = useState<string[]>(
    pipe.connectedCardFieldIds,
  );
  const [expirationAlertTime, setExpirationAlertTime] = useState(
    pipe.expirationAlertTime,
  );
  const [expirationAlertUnit, setExpirationAlertUnit] =
    useState<PipeExpirationAlertUnit>(
      pipe.expirationAlertUnit as PipeExpirationAlertUnit,
    );
  const [expirationAlertBusinessDaysOnly, setExpirationAlertBusinessDaysOnly] =
    useState(pipe.expirationAlertBusinessDaysOnly);
  const [visibility, setVisibility] = useState<PipeVisibility>(
    pipe.visibility as PipeVisibility,
  );
  const [aiAgentsEnabled, setAiAgentsEnabled] = useState(pipe.aiAgentsEnabled);
  const [aiCopilotEnabled, setAiCopilotEnabled] = useState(
    pipe.aiCopilotEnabled,
  );
  const [allowBulkActions, setAllowBulkActions] = useState(
    pipe.allowBulkActions,
  );
  const [restrictEditToAssignee, setRestrictEditToAssignee] = useState(
    pipe.restrictEditToAssignee,
  );
  const [restrictDeleteToAdmin, setRestrictDeleteToAdmin] = useState(
    pipe.restrictDeleteToAdmin,
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  function addTag() {
    const trimmed = tagDraft.trim();
    if (!trimmed || tags.length >= MAX_TAGS || tags.includes(trimmed)) return;
    setTags((prev) => [...prev, trimmed]);
    setTagDraft("");
  }

  function toggleKanbanPreviewField(fieldId: string) {
    setKanbanPreviewFieldIds((prev) =>
      prev.includes(fieldId)
        ? prev.filter((id) => id !== fieldId)
        : [...prev, fieldId],
    );
  }

  function addConnectedCardField(fieldId: string) {
    if (!fieldId || connectedCardFieldIds.includes(fieldId)) return;
    setConnectedCardFieldIds((prev) => [...prev, fieldId]);
  }

  function removeConnectedCardField(fieldId: string) {
    setConnectedCardFieldIds((prev) => prev.filter((id) => id !== fieldId));
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/pipes/${pipe.id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          icon,
          tags,
          itemName: itemName.trim() || null,
          createCardButtonLabel: createCardButtonLabel.trim() || null,
          defaultView,
          titleFieldId: titleFieldId || null,
          kanbanPreviewFieldIds,
          connectedCardFieldIds,
          expirationAlertTime,
          expirationAlertUnit,
          expirationAlertBusinessDaysOnly,
          visibility,
          aiAgentsEnabled,
          aiCopilotEnabled,
          allowBulkActions,
          restrictEditToAssignee,
          restrictDeleteToAdmin,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save settings");
      }
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const response = await fetch(`/api/pipes/${pipe.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to delete pipe");
      }
      router.push("/");
    } catch (err) {
      setDeleting(false);
      setError(err instanceof Error ? err.message : "Failed to delete pipe");
      setDeleteOpen(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1
        className="mb-4 text-xl font-semibold text-gray-900"
        data-testid="general-settings-heading"
      >
        {d.heading}
      </h1>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="space-y-4 rounded-md border border-gray-200 bg-white p-4">
          <div>
            <label
              htmlFor="pipe-icon"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              {d.iconLabel}
            </label>
            <select
              id="pipe-icon"
              data-testid="pipe-icon-select"
              value={icon}
              onChange={(event) => setIcon(event.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              {PIPE_ICONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="pipe-name"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              {d.nameLabel}
            </label>
            <input
              id="pipe-name"
              data-testid="pipe-name-input"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="pipe-tag-draft"
              className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700"
            >
              {d.tagsLabel}
              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs font-normal text-blue-700">
                {d.tagsNewBadge}
              </span>
            </label>
            <div className="mb-2 flex flex-wrap gap-2" data-testid="pipe-tags">
              {tags.map((tag) => (
                <span
                  key={tag}
                  data-testid="pipe-tag-chip"
                  className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700"
                >
                  {tag}
                  <button
                    type="button"
                    data-testid="remove-pipe-tag"
                    onClick={() =>
                      setTags((prev) => prev.filter((t) => t !== tag))
                    }
                    className="text-gray-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                id="pipe-tag-draft"
                data-testid="pipe-tag-input"
                type="text"
                value={tagDraft}
                disabled={tags.length >= MAX_TAGS}
                onChange={(event) => setTagDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addTag();
                  }
                }}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">{d.tagsMaxHint}</p>
          </div>

          <div>
            <label
              htmlFor="pipe-item-name"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              {d.itemNameLabel}
            </label>
            <input
              id="pipe-item-name"
              data-testid="pipe-item-name-input"
              type="text"
              value={itemName}
              onChange={(event) => setItemName(event.target.value)}
              placeholder={d.itemNamePlaceholder}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="pipe-create-button-label"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              {d.createButtonLabelLabel}
            </label>
            <input
              id="pipe-create-button-label"
              data-testid="pipe-create-button-label-input"
              type="text"
              value={createCardButtonLabel}
              onChange={(event) => setCreateCardButtonLabel(event.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="space-y-4 rounded-md border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">
            {d.visualHeading}
          </h2>

          <div>
            <p className="mb-1 text-sm font-medium text-gray-700">
              {d.defaultViewLabel}
            </p>
            <div className="flex gap-2">
              {(["kanban", "list"] as const).map((view) => (
                <button
                  key={view}
                  type="button"
                  data-testid={`default-view-${view}`}
                  onClick={() => setDefaultView(view)}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    defaultView === view
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {view === "kanban" ? d.defaultViewKanban : d.defaultViewList}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="pipe-title-field"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              {d.titleFieldLabel}
            </label>
            <select
              id="pipe-title-field"
              data-testid="pipe-title-field-select"
              value={titleFieldId}
              onChange={(event) => setTitleFieldId(event.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">{d.selectFieldPlaceholder}</option>
              {startFormFields.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-1 text-sm font-medium text-gray-700">
              {d.kanbanPreviewFieldsLabel}
            </p>
            <div className="space-y-1" data-testid="kanban-preview-fields">
              {startFormFields.map((field) => (
                <label
                  key={field.id}
                  className="flex items-center gap-2 text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    data-testid="kanban-preview-field-checkbox"
                    checked={kanbanPreviewFieldIds.includes(field.id)}
                    onChange={() => toggleKanbanPreviewField(field.id)}
                  />
                  {field.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">
                {d.connectedCardFieldsLabel}
              </p>
              {connectedCardFieldIds.length > 0 && (
                <button
                  type="button"
                  data-testid="clear-connected-card-fields"
                  onClick={() => setConnectedCardFieldIds([])}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {d.clearAll}
                </button>
              )}
            </div>
            <div
              className="mb-2 flex flex-wrap gap-2"
              data-testid="connected-card-fields"
            >
              {connectedCardFieldIds.map((fieldId) => (
                <span
                  key={fieldId}
                  data-testid="connected-card-field-chip"
                  className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700"
                >
                  {fieldId === "created_at"
                    ? attrLabels.createdAt
                    : attrLabels.currentPhase}
                  <button
                    type="button"
                    data-testid="remove-connected-card-field"
                    onClick={() => removeConnectedCardField(fieldId)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
            <select
              data-testid="add-connected-card-field"
              value=""
              onChange={(event) => addConnectedCardField(event.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">{d.selectFieldPlaceholder}</option>
              {CONNECTED_CARD_FIELD_OPTIONS.filter(
                (option) => !connectedCardFieldIds.includes(option),
              ).map((option) => (
                <option key={option} value={option}>
                  {option === "created_at"
                    ? attrLabels.createdAt
                    : attrLabels.currentPhase}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3 rounded-md border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">
            {d.expirationAlertHeading}
          </h2>
          <div className="flex items-end gap-3">
            <div>
              <label
                htmlFor="expiration-time"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                {d.expirationTimeLabel}
              </label>
              <input
                id="expiration-time"
                data-testid="expiration-alert-time-input"
                type="number"
                min={0}
                value={expirationAlertTime}
                onChange={(event) =>
                  setExpirationAlertTime(
                    Math.max(0, Number(event.target.value)),
                  )
                }
                className="w-24 rounded-md border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="expiration-unit"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                {d.expirationUnitLabel}
              </label>
              <select
                id="expiration-unit"
                data-testid="expiration-alert-unit-select"
                value={expirationAlertUnit}
                onChange={(event) =>
                  setExpirationAlertUnit(
                    event.target.value as PipeExpirationAlertUnit,
                  )
                }
                className="rounded-md border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="minutes">{d.expirationUnitMinutes}</option>
                <option value="hours">{d.expirationUnitHours}</option>
                <option value="days">{d.expirationUnitDays}</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              data-testid="expiration-business-days-checkbox"
              checked={expirationAlertBusinessDaysOnly}
              onChange={(event) =>
                setExpirationAlertBusinessDaysOnly(event.target.checked)
              }
            />
            {d.businessDaysOnlyLabel}
          </label>
        </div>

        <div className="space-y-4 rounded-md border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">
            {d.permissionsHeading}
          </h2>

          <div>
            <label
              htmlFor="pipe-visibility"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              {d.visibilityLabel}
            </label>
            <select
              id="pipe-visibility"
              data-testid="pipe-visibility-select"
              value={visibility}
              onChange={(event) =>
                setVisibility(event.target.value as PipeVisibility)
              }
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="org_open">
                {d.visibilityOrgOpen.replace("{org}", orgName)}
              </option>
              <option value="invite_only">{d.visibilityInviteOnly}</option>
            </select>
            {visibility === "org_open" && (
              <p className="mt-1 text-xs text-gray-500">
                {d.visibilityHelper.replace("{org}", orgName)}
              </p>
            )}
          </div>

          <div>
            <p className="mb-1 text-sm font-semibold text-gray-900">
              {d.aiToolsHeading}
            </p>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                data-testid="ai-agents-checkbox"
                checked={aiAgentsEnabled}
                onChange={(event) => setAiAgentsEnabled(event.target.checked)}
              />
              {d.aiAgentsLabel}
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                data-testid="ai-copilot-checkbox"
                checked={aiCopilotEnabled}
                onChange={(event) => setAiCopilotEnabled(event.target.checked)}
              />
              {d.aiCopilotLabel}
            </label>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                data-testid="allow-bulk-actions-checkbox"
                checked={allowBulkActions}
                onChange={(event) => setAllowBulkActions(event.target.checked)}
              />
              {d.allowBulkActionsLabel}
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                data-testid="restrict-edit-to-assignee-checkbox"
                checked={restrictEditToAssignee}
                onChange={(event) =>
                  setRestrictEditToAssignee(event.target.checked)
                }
              />
              {d.restrictEditToAssigneeLabel}
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                data-testid="restrict-delete-to-admin-checkbox"
                checked={restrictDeleteToAdmin}
                onChange={(event) =>
                  setRestrictDeleteToAdmin(event.target.checked)
                }
              />
              {d.restrictDeleteToAdminLabel}
            </label>
          </div>
        </div>

        {error && (
          <p
            className="text-sm text-red-600"
            data-testid="general-settings-error"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          data-testid="save-general-settings"
          disabled={saving || !name.trim()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {d.saveButton}
        </button>
      </form>

      <div className="mt-6 rounded-md border border-gray-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">
          {d.clonePipeHeading}
        </h2>
        <button
          type="button"
          data-testid="clone-pipe-button"
          disabled
          title={d.dangerZoneDescription}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-400 disabled:cursor-not-allowed"
        >
          {d.clonePipeButton}
        </button>
      </div>

      <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4">
        <p className="mb-2 text-sm text-red-800">{d.dangerZoneDescription}</p>
        <button
          type="button"
          data-testid="delete-pipe-button"
          onClick={() => setDeleteOpen(true)}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
        >
          {d.deletePipeButton}
        </button>
      </div>

      {toastVisible && (
        <div
          data-testid="general-settings-saved-toast"
          className="fixed bottom-6 left-6 z-20 rounded-md bg-gray-900 px-4 py-3 text-sm text-white shadow-lg"
        >
          {d.savedToast}
        </div>
      )}

      <Dialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/30" />
          <Dialog.Content className="fixed top-1/2 left-1/2 w-96 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-5 shadow-xl">
            <Dialog.Title className="mb-3 text-sm font-semibold text-gray-900">
              {d.deletePipeButton}
            </Dialog.Title>
            <p className="text-sm text-gray-600">{d.dangerZoneDescription}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
              >
                {dictionary.members.cancel}
              </button>
              <button
                type="button"
                data-testid="confirm-delete-pipe"
                disabled={deleting}
                onClick={handleDelete}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {d.deletePipeButton}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
