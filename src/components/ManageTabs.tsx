import type { Dictionary } from "@/lib/i18n/dictionaries";
import Link from "next/link";

export function ManageTabs({
  pipeId,
  active,
  dictionary,
}: {
  pipeId: string;
  active:
    | "phases"
    | "automations"
    | "reports"
    | "dashboards"
    | "members"
    | "general"
    | "activities";
  dictionary: Dictionary;
}) {
  const tabs: {
    key:
      | "phases"
      | "automations"
      | "reports"
      | "dashboards"
      | "members"
      | "general"
      | "activities";
    href: string;
    label: string;
  }[] = [
    {
      key: "phases",
      href: `/pipes/${pipeId}/settings/phases`,
      label: dictionary.manageTabs.phases,
    },
    {
      key: "members",
      href: `/pipes/${pipeId}/settings/members`,
      label: dictionary.manageTabs.members,
    },
    {
      key: "automations",
      href: `/pipes/${pipeId}/automations`,
      label: dictionary.manageTabs.automations,
    },
    {
      key: "reports",
      href: `/pipes/${pipeId}/reports_v2`,
      label: dictionary.manageTabs.reports,
    },
    {
      key: "dashboards",
      href: `/pipes/${pipeId}/dashboards`,
      label: dictionary.manageTabs.dashboards,
    },
    {
      key: "general",
      href: `/pipes/${pipeId}/settings/general-settings`,
      label: dictionary.manageTabs.general,
    },
    {
      key: "activities",
      href: `/pipes/${pipeId}/settings/activities`,
      label: dictionary.manageTabs.activities,
    },
  ];

  return (
    <nav
      data-testid="manage-tabs"
      className="flex gap-4 border-b border-gray-200 bg-white px-6"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          data-testid={`manage-tab-${tab.key}`}
          className={`border-b-2 px-1 py-3 text-sm font-medium ${
            tab.key === active
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
