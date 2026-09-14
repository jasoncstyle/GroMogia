export const SCHEDULED_TASKS = [
  {
    key: "search_console.refresh",
    name: "Refresh Search Console",
    section: "SEO",
    href: "/app/seo",
    description:
      "Pull the stored Search Console copy. GroovGro does not edit the website or buy ads.",
    permission: "manage_seo",
  },
  {
    key: "ga4.refresh",
    name: "Refresh Analytics",
    section: "Analytics",
    href: "/app/analytics",
    description:
      "Pull the stored GA4 copy (sessions, landing pages, sources). Ads stay off.",
    permission: "manage_seo",
  },
  {
    key: "website.read",
    name: "Read the website",
    section: "Website",
    href: "/app/website",
    description:
      "Find public pages on the connected site. GroovGro does not change the live site.",
    permission: "manage_website",
  },
  {
    key: "stripe.sync",
    name: "Sync Stripe copies",
    section: "Bookings",
    href: "/app/commerce",
    description:
      "Read recent payment copies. GroovGro does not charge a card or change checkout.",
    permission: "manage_integrations",
  },
] as const;

export type ScheduledTaskKey = (typeof SCHEDULED_TASKS)[number]["key"];

export function scheduledTaskByKey(key: string) {
  return SCHEDULED_TASKS.find((task) => task.key === key) ?? null;
}

export function isScheduledTaskKey(value: unknown): value is ScheduledTaskKey {
  return SCHEDULED_TASKS.some((task) => task.key === value);
}
