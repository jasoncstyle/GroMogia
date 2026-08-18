export const PERMISSIONS = [
  "manage_website",
  "publish_website",
  "manage_seo",
  "manage_advertising",
  "manage_social",
  "view_analytics",
  "manage_leads",
  "manage_customers",
  "manage_events",
  "manage_integrations",
  "manage_billing",
  "manage_users",
  "approve_ai_actions",
  "view_financials",
  "manage_brand",
  "manage_settings",
  "view_audit",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const SYSTEM_ROLES = [
  "owner",
  "admin",
  "marketing_manager",
  "website_manager",
  "sales_manager",
  "staff",
  "viewer",
] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];

const ALL: Permission[] = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<SystemRole, Permission[]> = {
  owner: ALL,
  admin: ALL.filter((permission) => permission !== "manage_billing"),
  marketing_manager: [
    "manage_advertising",
    "manage_social",
    "view_analytics",
    "manage_leads",
  ],
  website_manager: [
    "manage_website",
    "publish_website",
    "manage_seo",
    "manage_brand",
  ],
  sales_manager: [
    "manage_leads",
    "manage_customers",
    "manage_events",
    "view_analytics",
    "view_financials",
  ],
  staff: ["manage_leads", "manage_customers", "manage_events"],
  viewer: ["view_analytics"],
};

export function hasPermission(
  granted: readonly string[],
  needed: Permission,
): boolean {
  return granted.includes(needed);
}
