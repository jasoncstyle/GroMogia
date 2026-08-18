export type IntegrationStatus =
  | "connected"
  | "error"
  | "disconnected";

export type IntegrationConnection = {
  providerKey: string;
  status: IntegrationStatus;
  scopes: string[];
  lastSyncAt: Date | null;
  lastError: string | null;
};

export interface IntegrationAdapter {
  readonly providerKey: string;
  readonly capabilities: string[];
  disconnect(organizationId: string): Promise<void>;
}

export const KNOWN_PROVIDERS = [
  { key: "stripe", name: "Stripe", capabilities: ["payments", "bookings"] },
  { key: "resend", name: "Resend", capabilities: ["email"] },
  { key: "wordpress", name: "WordPress / SiteGround", capabilities: ["website"] },
  { key: "google", name: "Google", capabilities: ["analytics", "ads", "search"] },
  { key: "meta", name: "Meta", capabilities: ["ads", "social"] },
] as const;
