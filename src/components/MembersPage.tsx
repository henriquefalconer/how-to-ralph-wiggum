"use client";

import type { Dictionary } from "@/lib/i18n";
import type { PipeMemberRole, PipeMemberWithUser } from "@/lib/pipe-members";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { useMemo, useState } from "react";

const ROLE_ORDER: PipeMemberRole[] = [
  "pipe_admin",
  "pipe_member",
  "read_only",
  "restricted_view",
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

export function MembersPage({
  pipeId,
  pipeName,
  members,
  dictionary,
}: {
  pipeId: string;
  pipeName: string;
  members: PipeMemberWithUser[];
  dictionary: Dictionary;
}) {
  const d = dictionary.members;
  const [list, setList] = useState(members);
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<PipeMemberRole>("pipe_member");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [removeTargetId, setRemoveTargetId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const visible = useMemo(() => {
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter((m) => m.user.name.toLowerCase().includes(q));
  }, [list, search]);

  async function handleInvite() {
    setInviteError(null);
    const response = await fetch(`/api/pipes/${pipeId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: inviteName,
        email: inviteEmail,
        role: inviteRole,
      }),
    });
    const body = await response.json();
    if (!response.ok) {
      setInviteError(body.error ?? "Failed to invite");
      return;
    }
    setList((prev) => [...prev, body.member]);
    setInviteOpen(false);
    setInviteName("");
    setInviteEmail("");
    setInviteRole("pipe_member");
  }

  async function handleRoleChange(memberId: string, role: PipeMemberRole) {
    const previous = list;
    setList((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role } : m)),
    );
    const response = await fetch(`/api/pipe-members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!response.ok) {
      setList(previous);
      const body = await response.json().catch(() => null);
      setRemoveError(body?.error ?? "Failed to update role");
    }
  }

  async function handleRemove() {
    if (!removeTargetId) return;
    setRemoveError(null);
    const response = await fetch(`/api/pipe-members/${removeTargetId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setRemoveError(body?.error ?? "Failed to remove member");
      return;
    }
    setList((prev) => prev.filter((m) => m.id !== removeTargetId));
    setRemoveTargetId(null);
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1
          className="text-xl font-semibold text-gray-900"
          data-testid="members-heading"
        >
          {d.heading
            .replace("{count}", String(list.length))
            .replace("{pipeName}", pipeName)}
        </h1>
        <button
          type="button"
          data-testid="invite-members-button"
          onClick={() => setInviteOpen(true)}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          {d.inviteButton}
        </button>
      </div>

      <input
        data-testid="members-search"
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={d.searchPlaceholder}
        className="mb-4 w-64 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
      />

      <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
        <table className="w-full text-left text-sm" data-testid="members-table">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">{d.columnName}</th>
              <th className="px-4 py-2 font-medium">{d.columnRole}</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                  {d.emptyState}
                </td>
              </tr>
            ) : (
              visible.map((member) => (
                <tr
                  key={member.id}
                  data-testid="member-row"
                  data-member-id={member.id}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1AB6A6] text-xs font-semibold text-white">
                        {initials(member.user.name)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {member.user.name}
                          {member.user.isSelf && (
                            <span
                              data-testid="member-self-tag"
                              className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-xs font-normal text-blue-700"
                            >
                              {d.selfTag}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          {member.user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button
                          type="button"
                          data-testid="member-role-trigger"
                          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          {d.roles[member.role].label} ▾
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content className="w-72 rounded-md border border-gray-200 bg-white p-1 shadow-lg">
                          {ROLE_ORDER.map((role) => (
                            <DropdownMenu.Item
                              key={role}
                              data-testid={`member-role-option-${role}`}
                              onSelect={() => handleRoleChange(member.id, role)}
                              className={`cursor-pointer rounded px-2 py-1.5 hover:bg-gray-100 ${
                                role === member.role ? "bg-blue-50" : ""
                              }`}
                            >
                              <p className="text-sm font-medium text-gray-900">
                                {d.roles[role].label}
                              </p>
                              <p className="text-xs text-gray-500">
                                {d.roles[role].description}
                              </p>
                            </DropdownMenu.Item>
                          ))}
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      data-testid="member-remove-button"
                      title={d.removeTooltip}
                      onClick={() => setRemoveTargetId(member.id)}
                      className="rounded-md px-2 py-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {removeError && (
        <p className="mt-2 text-sm text-red-600" data-testid="members-error">
          {removeError}
        </p>
      )}

      <Link
        href={`/pipes/${pipeId}`}
        className="mt-6 inline-block text-sm text-blue-600 hover:underline"
      >
        ← {dictionary.automations.backToBoard}
      </Link>

      <Dialog.Root open={inviteOpen} onOpenChange={setInviteOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/30" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-96 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-5 shadow-xl">
            <Dialog.Title className="mb-3 text-sm font-semibold text-gray-900">
              {d.inviteModalTitle}
            </Dialog.Title>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="invite-name"
                  className="mb-1 block text-xs font-medium text-gray-700"
                >
                  {d.nameLabel}
                </label>
                <input
                  id="invite-name"
                  data-testid="invite-name-input"
                  type="text"
                  value={inviteName}
                  onChange={(event) => setInviteName(event.target.value)}
                  placeholder={d.namePlaceholder}
                  className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="invite-email"
                  className="mb-1 block text-xs font-medium text-gray-700"
                >
                  {d.emailLabel}
                </label>
                <input
                  id="invite-email"
                  data-testid="invite-email-input"
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder={d.emailPlaceholder}
                  className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="invite-role"
                  className="mb-1 block text-xs font-medium text-gray-700"
                >
                  {d.roleLabel}
                </label>
                <select
                  id="invite-role"
                  data-testid="invite-role-select"
                  value={inviteRole}
                  onChange={(event) =>
                    setInviteRole(event.target.value as PipeMemberRole)
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                >
                  {ROLE_ORDER.map((role) => (
                    <option key={role} value={role}>
                      {d.roles[role].label}
                    </option>
                  ))}
                </select>
              </div>
              {inviteError && (
                <p className="text-sm text-red-600" data-testid="invite-error">
                  {inviteError}
                </p>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
              >
                {d.cancel}
              </button>
              <button
                type="button"
                data-testid="confirm-invite-button"
                onClick={handleInvite}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                {d.submit}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={removeTargetId !== null}
        onOpenChange={(open) => !open && setRemoveTargetId(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/30" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-96 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-5 shadow-xl">
            <Dialog.Title className="mb-3 text-sm font-semibold text-gray-900">
              {d.removeTooltip}
            </Dialog.Title>
            <p className="text-sm text-gray-600">{d.removeConfirm}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRemoveTargetId(null)}
                className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
              >
                {d.cancel}
              </button>
              <button
                type="button"
                data-testid="confirm-remove-member"
                onClick={handleRemove}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
              >
                {d.removeTooltip}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
