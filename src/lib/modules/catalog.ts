export type ModuleId =
  | "brand"
  | "integrations"
  | "media"
  | "website_connect"
  | "website_builder"
  | "events"
  | "crm"
  | "commerce"
  | "marketing"
  | "analytics"
  | "seo"
  | "social"
  | "reviews"
  | "intelligence"
  | "brand_voice"
  | "billing";

export type ModuleDefinition = {
  id: ModuleId;
  name: string;
  description: string;
  phase: number;
  href: string;
  navGroup: "work" | "grow" | "settings";
};

export const PHASE_1_MODULES: ModuleId[] = ["brand", "integrations", "media"];

export const PHASE_2_MODULES: ModuleId[] = [
  "website_connect",
  "events",
  "crm",
  "commerce",
  "analytics",
];

export const PHASE_3_MODULES: ModuleId[] = ["marketing"];

export const PHASE_4_MODULES: ModuleId[] = ["intelligence"];

export const PHASE_5_MODULES: ModuleId[] = ["brand_voice"];

export const PHASE_6_MODULES: ModuleId[] = ["seo"];

export const ENABLED_BY_DEFAULT_MODULES: ModuleId[] = [
  ...PHASE_1_MODULES,
  ...PHASE_2_MODULES,
  ...PHASE_3_MODULES,
  ...PHASE_4_MODULES,
  ...PHASE_5_MODULES,
  ...PHASE_6_MODULES,
];

export const MODULE_CATALOG: ModuleDefinition[] = [
  {
    id: "brand",
    name: "Brand",
    description: "Business name, logo, colors, and contact details.",
    phase: 1,
    href: "/app/settings/brand",
    navGroup: "settings",
  },
  {
    id: "integrations",
    name: "Integrations",
    description: "Connect Stripe, websites, email, and other systems.",
    phase: 1,
    href: "/app/integrations",
    navGroup: "settings",
  },
  {
    id: "media",
    name: "Media library",
    description: "Tenant-isolated files and brand assets.",
    phase: 1,
    href: "/app/settings/brand",
    navGroup: "settings",
  },
  {
    id: "website_connect",
    name: "Website connection",
    description: "Connect an existing SiteGround or WordPress site.",
    phase: 2,
    href: "/app/website",
    navGroup: "work",
  },
  {
    id: "events",
    name: "Events",
    description: "Generic calendar for classes, workshops, and appointments.",
    phase: 2,
    href: "/app/events",
    navGroup: "work",
  },
  {
    id: "crm",
    name: "Leads & customers",
    description: "Contacts, pipeline, and customer history.",
    phase: 2,
    href: "/app/crm",
    navGroup: "work",
  },
  {
    id: "commerce",
    name: "Bookings & payments",
    description: "Stripe bookings without storing card numbers.",
    phase: 2,
    href: "/app/commerce",
    navGroup: "work",
  },
  {
    id: "analytics",
    name: "Analytics",
    description: "Outcomes across marketing, leads, and revenue.",
    phase: 2,
    href: "/app/analytics",
    navGroup: "grow",
  },
  {
    id: "marketing",
    name: "Marketing",
    description: "Campaigns, channels, and attribution.",
    phase: 3,
    href: "/app/marketing",
    navGroup: "grow",
  },
  {
    id: "intelligence",
    name: "Intelligence",
    description: "Plain-language insights on real connected data.",
    phase: 4,
    href: "/app/intelligence",
    navGroup: "grow",
  },
  {
    id: "brand_voice",
    name: "Brand voice",
    description: "Approved writing examples and content generation.",
    phase: 5,
    href: "/app/brand-voice",
    navGroup: "grow",
  },
  {
    id: "seo",
    name: "SEO",
    description: "Homepage checks, score over time, and drafts in plain English.",
    phase: 6,
    href: "/app/seo",
    navGroup: "grow",
  },
  {
    id: "website_builder",
    name: "Website builder",
    description: "Optional section-based GroovGro sites.",
    phase: 7,
    href: "/app/website-builder",
    navGroup: "work",
  },
  {
    id: "social",
    name: "Social",
    description: "Publishing and calendars where APIs allow.",
    phase: 8,
    href: "/app/social",
    navGroup: "grow",
  },
  {
    id: "reviews",
    name: "Reviews",
    description: "Reputation from official platform APIs only.",
    phase: 8,
    href: "/app/reviews",
    navGroup: "grow",
  },
  {
    id: "billing",
    name: "Billing",
    description: "GroovGro subscriptions via Stripe.",
    phase: 10,
    href: "/app/settings/billing",
    navGroup: "settings",
  },
];

export function modulesForPhase(maxPhase: number): ModuleDefinition[] {
  return MODULE_CATALOG.filter((module) => module.phase <= maxPhase);
}

export function isModuleEnabled(
  enabled: readonly string[],
  moduleId: ModuleId,
): boolean {
  return enabled.includes(moduleId);
}

export function navModules(
  enabled: readonly string[],
  group: ModuleDefinition["navGroup"],
): ModuleDefinition[] {
  return MODULE_CATALOG.filter(
    (module) => module.navGroup === group && enabled.includes(module.id),
  );
}
