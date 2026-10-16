export const OWNER_DO_HREF = "/app/grow/do";
export const LEGACY_NEXT_STEP_HREF = "/app/next-step";

export type OwnerNavId = "home" | "grow" | "work" | "results" | "business";

export type OwnerNavItem = {
  id: OwnerNavId
  label: string
  href: string
};

export const PRIMARY_OWNER_NAV: readonly OwnerNavItem[] = [
  { id: "home", label: "Home", href: "/app" },
  { id: "grow", label: "Grow", href: "/app/grow" },
  { id: "work", label: "Work", href: "/app/work" },
  { id: "results", label: "Results", href: "/app/results" },
  { id: "business", label: "Business", href: "/app/business" },
] as const;

export type SettingsLink = {
  href: string
  label: string
  hint: string
};

export const SETTINGS_LINKS: readonly SettingsLink[] = [
  { href: "/app/settings", label: "Organization", hint: "This workspace, team, and refresh schedules." },
  { href: "/app/settings/connections", label: "Connections", hint: "Read-only services GroovGro already uses." },
  { href: "/app/settings/brand", label: "Brand details", hint: "Name, colors, and contact details." },
  { href: "/app/settings/team", label: "Team", hint: "Who can see this workspace." },
  { href: "/app/settings/schedules", label: "Refresh schedules", hint: "How often GroovGro re-reads connected data." },
  { href: "/app/settings/new-business", label: "Add a business", hint: "Open a separate workspace. Data stays apart." },
  { href: "/app/website", label: "Website", hint: "The public site GroovGro can read. It does not change it." },
  { href: "/app/analytics", label: "Analytics tables", hint: "Stored Google Analytics numbers, when connected." },
  { href: "/app/marketing", label: "Named shares", hint: "How people found this business." },
  { href: "/app/crm", label: "People", hint: "Leads and customers already stored." },
  { href: "/app/commerce", label: "Bookings & payments", hint: "Payment copies. GroovGro does not charge cards." },
  { href: "/app/events", label: "Calendar", hint: "Classes, workshops, and appointments." },
  { href: "/app/seo", label: "Search details", hint: "Advanced search checks. Not the everyday Home." },
  { href: "/app/media", label: "Files", hint: "Images and brand assets for this business." },
  { href: "/app/notifications", label: "Notifications", hint: "Older alerts list." },
  { href: "/app/audit", label: "Activity log", hint: "What changed in this workspace." },
  { href: "/app/settings/desk", label: "Earlier dashboard", hint: "The previous numbers desk, kept for reference." },
] as const;

export const HIDDEN_ADVANCED_HREFS = [
  "/app/bot-team",
  "/app/website-builder",
] as const;

export type LegacyRedirect = {
  source: string
  destination: string
};

export const LEGACY_OWNER_REDIRECTS: readonly LegacyRedirect[] = [
  { source: "/app/next-step", destination: "/app/grow" },
  { source: "/app/growth-review", destination: "/app/results" },
  { source: "/app/intelligence", destination: "/app/results" },
  { source: "/app/integrations", destination: "/app/settings/connections" },
] as const;

export function isPrimaryNavActive(pathname: string, href: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  if (href === "/app") return path === "/app";
  if (href === "/app/grow") {
    return path === "/app/grow" || path.startsWith("/app/grow/");
  }
  if (href === "/app/business") {
    return path === "/app/business" || path.startsWith("/app/business/");
  }
  if (href === "/app/work") {
    return path === "/app/work" || path.startsWith("/app/work/");
  }
  if (href === "/app/results") {
    return path === "/app/results" || path.startsWith("/app/results/");
  }
  return path === href || path.startsWith(`${href}/`);
}

export function firstNameFrom(name?: string | null): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0] ?? "";
}

export function greetingFor(name?: string | null, businessName?: string | null): {
  hello: string
  context: string
} {
  const first = firstNameFrom(name);
  const business = (businessName ?? "").trim();
  return {
    hello: first ? `Hi ${first}.` : "Hi there.",
    context: business
      ? `Here is ${business}. GroovGro is here to help this business grow.`
      : "GroovGro is here to help this business grow.",
  };
}
