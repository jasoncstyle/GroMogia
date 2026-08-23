import { sql } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"),
  ...timestamps,
}, (table) => [
  uniqueIndex("organizations_slug_idx").on(table.slug),
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkUserId: text("clerk_user_id").notNull(),
  email: text("email").notNull(),
  name: text("name").notNull().default(""),
  platformRole: text("platform_role"),
  ...timestamps,
}, (table) => [
  uniqueIndex("users_clerk_user_id_idx").on(table.clerkUserId),
]);

export const memberships = pgTable("memberships", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("active"),
  ...timestamps,
}, (table) => [
  uniqueIndex("memberships_org_user_idx").on(table.organizationId, table.userId),
  index("memberships_org_idx").on(table.organizationId),
]);

export const permissions = pgTable("permissions", {
  id: text("id").primaryKey(),
  description: text("description").notNull(),
});

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  key: text("key").notNull(),
  name: text("name").notNull(),
  isSystem: boolean("is_system").notNull().default(false),
  ...timestamps,
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: text("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permissionId] })],
);

export const membershipRoles = pgTable(
  "membership_roles",
  {
    membershipId: uuid("membership_id")
      .notNull()
      .references(() => memberships.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.membershipId, table.roleId] })],
);

export const modules = pgTable("modules", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  phaseIntroduced: integer("phase_introduced").notNull(),
});

export const organizationModules = pgTable(
  "organization_modules",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    moduleId: text("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("enabled"),
    source: text("source").notNull().default("manual"),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.moduleId] }),
    index("organization_modules_org_idx").on(table.organizationId),
  ],
);

export const featureFlags = pgTable("feature_flags", {
  key: text("key").primaryKey(),
  description: text("description").notNull(),
  enabledGlobally: boolean("enabled_globally").notNull().default(false),
  enabledForPlatform: boolean("enabled_for_platform").notNull().default(false),
});

export const organizationFeatureFlags = pgTable(
  "organization_feature_flags",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    flagKey: text("flag_key")
      .notNull()
      .references(() => featureFlags.key, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.flagKey] }),
  ],
);

export const brandSettings = pgTable("brand_settings", {
  organizationId: uuid("organization_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  businessName: text("business_name").notNull().default(""),
  description: text("description").notNull().default(""),
  targetCustomers: text("target_customers").notNull().default(""),
  colors: jsonb("colors").$type<Record<string, string>>().notNull().default({}),
  fonts: jsonb("fonts").$type<Record<string, string>>().notNull().default({}),
  contact: jsonb("contact").$type<Record<string, string>>().notNull().default({}),
  socialProfiles: jsonb("social_profiles")
    .$type<Record<string, string>>()
    .notNull()
    .default({}),
  terminology: jsonb("terminology")
    .$type<Record<string, string>>()
    .notNull()
    .default({}),
  logoAssetId: uuid("logo_asset_id"),
  ...timestamps,
});

export const integrationProviders = pgTable("integration_providers", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  capabilities: jsonb("capabilities").$type<string[]>().notNull().default([]),
});

export const integrationConnections = pgTable(
  "integration_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    providerKey: text("provider_key")
      .notNull()
      .references(() => integrationProviders.key),
    status: text("status").notNull().default("disconnected"),
    scopes: text("scopes").array().notNull().default(sql`'{}'`),
    secretRef: text("secret_ref"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    lastError: text("last_error"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("integration_connections_org_provider_idx").on(
      table.organizationId,
      table.providerKey,
    ),
    index("integration_connections_org_idx").on(table.organizationId),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("audit_events_org_idx").on(table.organizationId)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href"),
    readAt: timestamp("read_at", { withTimezone: true }),
    emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("notifications_user_idx").on(table.userId)],
);

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    inApp: boolean("in_app").notNull().default(true),
    email: boolean("email").notNull().default(false),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.organizationId, table.type] }),
  ],
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    blobPathname: text("blob_pathname").notNull(),
    publicUrl: text("public_url").notNull().default(""),
    originalName: text("original_name").notNull().default(""),
    contentType: text("content_type").notNull(),
    byteSize: integer("byte_size").notNull().default(0),
    kind: text("kind").notNull().default("image"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("media_assets_org_idx").on(table.organizationId)],
);

export const aiActionLogs = pgTable(
  "ai_action_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    level: integer("level").notNull().default(1),
    actionType: text("action_type").notNull(),
    inputSummary: text("input_summary").notNull().default(""),
    output: text("output").notNull().default(""),
    status: text("status").notNull().default("observed"),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    approvedBy: uuid("approved_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("ai_action_logs_org_idx").on(table.organizationId)],
);

export const websites = pgTable(
  "websites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("connected"),
    publicUrl: text("public_url").notNull().default(""),
    provider: text("provider").notNull().default("other"),
    trackingId: text("tracking_id").notNull(),
    status: text("status").notNull().default("active"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("websites_tracking_id_idx").on(table.trackingId),
    index("websites_org_idx").on(table.organizationId),
  ],
);

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull().default(""),
    email: text("email"),
    phone: text("phone"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("contacts_org_email_idx").on(table.organizationId, table.email),
    index("contacts_org_idx").on(table.organizationId),
  ],
);

export const leadStages = pgTable(
  "lead_stages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isWon: boolean("is_won").notNull().default(false),
    isLost: boolean("is_lost").notNull().default(false),
  },
  (table) => [
    uniqueIndex("lead_stages_org_key_idx").on(table.organizationId, table.key),
    index("lead_stages_org_idx").on(table.organizationId),
  ],
);

export const leadRecords = pgTable(
  "lead_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    stageId: uuid("stage_id")
      .notNull()
      .references(() => leadStages.id),
    source: text("source").notNull().default("manual"),
    campaignId: text("campaign_id"),
    landingPage: text("landing_page"),
    formId: text("form_id"),
    assignedUserId: uuid("assigned_user_id").references(() => users.id),
    estimatedValueCents: integer("estimated_value_cents"),
    notes: text("notes").notNull().default(""),
    convertedAt: timestamp("converted_at", { withTimezone: true }),
    goalId: uuid("goal_id"),
    planId: uuid("plan_id"),
    offerId: uuid("offer_id"),
    ...timestamps,
  },
  (table) => [
    index("lead_records_org_idx").on(table.organizationId),
    index("lead_records_contact_idx").on(table.contactId),
  ],
);

export const leadActivities = pgTable(
  "lead_activities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leadRecords.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    body: text("body").notNull().default(""),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("lead_activities_lead_idx").on(table.leadId)],
);

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    firstConvertedAt: timestamp("first_converted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    ltvCents: integer("ltv_cents").notNull().default(0),
    marketingSource: text("marketing_source"),
  },
  (table) => [
    uniqueIndex("customers_contact_idx").on(table.contactId),
    index("customers_org_idx").on(table.organizationId),
  ],
);

export const attributionTouches = pgTable(
  "attribution_touches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    sessionId: text("session_id"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    channel: text("channel").notNull().default("direct"),
    campaignId: text("campaign_id"),
    landingPage: text("landing_page"),
    referrer: text("referrer"),
    raw: jsonb("raw").$type<Record<string, unknown>>().notNull().default({}),
    goalId: uuid("goal_id"),
  },
  (table) => [
    index("attribution_touches_org_idx").on(table.organizationId),
    index("attribution_touches_session_idx").on(table.sessionId),
  ],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    eventType: text("event_type").notNull().default("event"),
    location: text("location").notNull().default(""),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    capacity: integer("capacity"),
    priceCents: integer("price_cents").notNull().default(0),
    currency: text("currency").notNull().default("usd"),
    registrationUrl: text("registration_url").notNull().default(""),
    featuredAssetId: uuid("featured_asset_id"),
    visibility: text("visibility").notNull().default("public"),
    status: text("status").notNull().default("draft"),
    goalId: uuid("goal_id"),
    offerId: uuid("offer_id"),
    ...timestamps,
  },
  (table) => [index("events_org_idx").on(table.organizationId)],
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    eventId: uuid("event_id").references(() => events.id, {
      onDelete: "set null",
    }),
    externalProvider: text("external_provider").notNull().default("stripe"),
    externalId: text("external_id").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    status: text("status").notNull().default("confirmed"),
    source: text("source").notNull().default("stripe"),
    campaignId: text("campaign_id"),
    goalId: uuid("goal_id"),
    offerId: uuid("offer_id"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("bookings_provider_external_idx").on(
      table.externalProvider,
      table.externalId,
    ),
    index("bookings_org_idx").on(table.organizationId),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    bookingId: uuid("booking_id").references(() => bookings.id, {
      onDelete: "set null",
    }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    provider: text("provider").notNull().default("stripe"),
    providerObjectId: text("provider_object_id").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("usd"),
    kind: text("kind").notNull().default("charge"),
    status: text("status").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("payments_provider_object_idx").on(
      table.provider,
      table.providerObjectId,
    ),
    index("payments_org_idx").on(table.organizationId),
  ],
);

export const brandVoiceProfiles = pgTable("brand_voice_profiles", {
  organizationId: uuid("organization_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  tone: text("tone").notNull().default(""),
  audience: text("audience").notNull().default(""),
  doSay: text("do_say").notNull().default(""),
  dontSay: text("dont_say").notNull().default(""),
  ...timestamps,
});

export const brandVoiceExamples = pgTable(
  "brand_voice_examples",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull().default(""),
    body: text("body").notNull(),
    direction: text("direction").notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps,
  },
  (table) => [index("brand_voice_examples_org_idx").on(table.organizationId)],
);

export type SeoAuditFinding = {
  id: string
  severity: "ok" | "warn" | "fail"
  title: string
  detail: string
  recommendation: string
};

export const seoAudits = pgTable(
  "seo_audits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id").references(() => websites.id, {
      onDelete: "set null",
    }),
    url: text("url").notNull(),
    status: text("status").notNull().default("ok"),
    score: integer("score").notNull().default(0),
    summary: text("summary").notNull().default(""),
    findings: jsonb("findings").$type<SeoAuditFinding[]>().notNull().default([]),
    builderSiteId: uuid("builder_site_id").references(() => builderSites.id, {
      onDelete: "set null",
    }),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("seo_audits_org_idx").on(table.organizationId),
    index("seo_audits_page_idx").on(table.builderSiteId),
  ],
);

export const seoDrafts = pgTable(
  "seo_drafts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    auditId: uuid("audit_id").references(() => seoAudits.id, {
      onDelete: "set null",
    }),
    findingId: text("finding_id").notNull(),
    title: text("title").notNull(),
    proposedChange: text("proposed_change").notNull(),
    howToApply: text("how_to_apply").notNull().default(""),
    status: text("status").notNull().default("draft"),
    builderSiteId: uuid("builder_site_id").references(() => builderSites.id, {
      onDelete: "set null",
    }),
    createdBy: uuid("created_by").references(() => users.id),
    decidedBy: uuid("decided_by").references(() => users.id),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("seo_drafts_org_idx").on(table.organizationId),
    index("seo_drafts_page_idx").on(table.builderSiteId),
  ],
);

export type SearchConsoleTotals = {
  clicks: number
  impressions: number
  ctr: number
  position: number
};

export type SearchConsoleMetricRow = {
  key: string
  clicks: number
  impressions: number
  ctr: number
  position: number
};

export const searchConsoleSnapshots = pgTable(
  "search_console_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    propertyUrl: text("property_url").notNull(),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    totals: jsonb("totals").$type<SearchConsoleTotals>().notNull().default({
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
    }),
    topQueries: jsonb("top_queries")
      .$type<SearchConsoleMetricRow[]>()
      .notNull()
      .default([]),
    topPages: jsonb("top_pages")
      .$type<SearchConsoleMetricRow[]>()
      .notNull()
      .default([]),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("search_console_snapshots_org_idx").on(table.organizationId)],
);

export type BuilderSectionType =
  | "hero"
  | "text"
  | "cta"
  | "lead"
  | "image_text"
  | "features"
  | "testimonials"
  | "faq"
  | "contact"
  | "button"
  | "image"
  | "video"
  | "gallery"
  | "map"
  | "pricing"
  | "hours"
  | "countdown"
  | "social"
  | "call";

export type BuilderTheme = {
  pageBackground?: string
  textColor?: string
  headingColor?: string
  buttonBackground?: string
  buttonText?: string
};

export type BuilderSectionContent = {
  heading?: string
  subheading?: string
  body?: string
  buttonLabel?: string
  buttonHref?: string
  imageUrl?: string
  imageAlt?: string
  items?: string
  headingLevel?: string
  linkLabel?: string
  linkHref?: string
  backgroundColor?: string
  textColor?: string
  headingColor?: string
  videoUrl?: string
  mapQuery?: string
  endAt?: string
  phone?: string
  whatsapp?: string
};

export const builderChrome = pgTable("builder_chrome", {
  organizationId: uuid("organization_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  showHeader: boolean("show_header").notNull().default(true),
  showFooter: boolean("show_footer").notNull().default(true),
  showPageLinks: boolean("show_page_links").notNull().default(true),
  headerName: text("header_name").notNull().default(""),
  logoUrl: text("logo_url").notNull().default(""),
  footerText: text("footer_text").notNull().default(""),
  headerBackgroundColor: text("header_background_color").notNull().default(""),
  footerBackgroundColor: text("footer_background_color").notNull().default(""),
  ...timestamps,
});

export const builderSites = pgTable(
  "builder_sites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull().default(""),
    metaDescription: text("meta_description").notNull().default(""),
    status: text("status").notNull().default("draft"),
    theme: jsonb("theme").$type<BuilderTheme>().notNull().default({}),
    templateId: text("template_id").notNull().default(""),
    slug: text("slug").notNull().default(""),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps,
  },
  (table) => [uniqueIndex("builder_sites_org_slug_idx").on(table.organizationId, table.slug)],
);

export const builderRows = pgTable(
  "builder_rows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    siteId: uuid("site_id")
      .notNull()
      .references(() => builderSites.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    columnWidths: jsonb("column_widths").$type<number[]>().notNull().default([100]),
    backgroundColor: text("background_color").notNull().default(""),
    contentWidth: text("content_width").notNull().default("normal"),
    parentRowId: uuid("parent_row_id"),
    parentColumnIndex: integer("parent_column_index"),
    ...timestamps,
  },
  (table) => [
    index("builder_rows_org_idx").on(table.organizationId),
    index("builder_rows_site_idx").on(table.siteId),
    index("builder_rows_parent_idx").on(table.parentRowId),
    foreignKey({
      columns: [table.parentRowId],
      foreignColumns: [table.id],
      name: "builder_rows_parent_row_id_builder_rows_id_fk",
    }).onDelete("cascade"),
  ],
);

export const builderSections = pgTable(
  "builder_sections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    siteId: uuid("site_id")
      .notNull()
      .references(() => builderSites.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    visible: boolean("visible").notNull().default(true),
    content: jsonb("content").$type<BuilderSectionContent>().notNull().default({}),
    rowId: uuid("row_id").references(() => builderRows.id, { onDelete: "cascade" }),
    columnIndex: integer("column_index").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index("builder_sections_org_idx").on(table.organizationId),
    index("builder_sections_site_idx").on(table.siteId),
    index("builder_sections_row_idx").on(table.rowId),
  ],
);

export const businessBrains = pgTable("business_brains", {
  organizationId: uuid("organization_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  industry: text("industry").notNull().default(""),
  businessModel: text("business_model").notNull().default(""),
  locations: jsonb("locations").$type<string[]>().notNull().default([]),
  serviceAreas: jsonb("service_areas").$type<string[]>().notNull().default([]),
  operatingHours: text("operating_hours").notNull().default(""),
  seasonality: text("seasonality").notNull().default(""),
  notes: text("notes").notNull().default(""),
  discoveryStatus: text("discovery_status").notNull().default("not_started"),
  inferredSummary: text("inferred_summary").notNull().default(""),
  inferredSource: text("inferred_source").notNull().default(""),
  confidence: integer("confidence").notNull().default(0),
  ...timestamps,
});

export const offers = pgTable(
  "offers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    offerType: text("offer_type").notNull().default("other"),
    category: text("category").notNull().default(""),
    pricingModel: text("pricing_model").notNull().default("unspecified"),
    priceCents: integer("price_cents"),
    costCents: integer("cost_cents"),
    estimatedMarginCents: integer("estimated_margin_cents"),
    currency: text("currency").notNull().default("usd"),
    availabilityModel: text("availability_model").notNull().default("unconstrained"),
    activeFrom: timestamp("active_from", { withTimezone: true }),
    activeTo: timestamp("active_to", { withTimezone: true }),
    location: text("location").notNull().default(""),
    conversionUrl: text("conversion_url").notNull().default(""),
    externalProvider: text("external_provider").notNull().default(""),
    externalId: text("external_id").notNull().default(""),
    status: text("status").notNull().default("active"),
    ...timestamps,
  },
  (table) => [index("offers_org_idx").on(table.organizationId)],
);

export const availabilityConstraints = pgTable(
  "availability_constraints",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    offerId: uuid("offer_id").references(() => offers.id, { onDelete: "set null" }),
    constraintType: text("constraint_type").notNull(),
    unit: text("unit").notNull().default(""),
    totalAvailability: integer("total_availability"),
    remainingAvailability: integer("remaining_availability"),
    resourceName: text("resource_name").notNull().default(""),
    startsOn: timestamp("starts_on", { withTimezone: true }),
    endsOn: timestamp("ends_on", { withTimezone: true }),
    source: text("source").notNull().default("manual"),
    externalId: text("external_id").notNull().default(""),
    refreshedAt: timestamp("refreshed_at", { withTimezone: true }),
    notes: text("notes").notNull().default(""),
    ...timestamps,
  },
  (table) => [
    index("availability_constraints_org_idx").on(table.organizationId),
    index("availability_constraints_offer_idx").on(table.offerId),
  ],
);

export const growthGoals = pgTable(
  "growth_goals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    goalType: text("goal_type").notNull().default("custom"),
    status: text("status").notNull().default("active"),
    priority: text("priority").notNull().default("normal"),
    startsOn: timestamp("starts_on", { withTimezone: true }),
    deadline: timestamp("deadline", { withTimezone: true }),
    targetMetric: text("target_metric").notNull().default(""),
    targetValue: integer("target_value"),
    baselineValue: integer("baseline_value"),
    currentValue: integer("current_value").notNull().default(0),
    unit: text("unit").notNull().default(""),
    offerId: uuid("offer_id").references(() => offers.id, { onDelete: "set null" }),
    customerSegment: text("customer_segment").notNull().default(""),
    location: text("location").notNull().default(""),
    expectedRevenueCents: integer("expected_revenue_cents"),
    expectedMarginCents: integer("expected_margin_cents"),
    totalBudgetCents: integer("total_budget_cents"),
    channelLimits: text("channel_limits").notNull().default(""),
    applicableConstraints: text("applicable_constraints").notNull().default(""),
    successDefinition: text("success_definition").notNull().default(""),
    createdBy: uuid("created_by").references(() => users.id),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("growth_goals_org_idx").on(table.organizationId),
    index("growth_goals_offer_idx").on(table.offerId),
  ],
);

export const growthPlans = pgTable(
  "growth_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => growthGoals.id, { onDelete: "cascade" }),
    strategySummary: text("strategy_summary").notNull().default(""),
    status: text("status").notNull().default("draft"),
    version: integer("version").notNull().default(1),
    startsOn: timestamp("starts_on", { withTimezone: true }),
    endsOn: timestamp("ends_on", { withTimezone: true }),
    budgetCents: integer("budget_cents"),
    createdBy: uuid("created_by").references(() => users.id),
    createdByAi: boolean("created_by_ai").notNull().default(false),
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("growth_plans_org_idx").on(table.organizationId),
    index("growth_plans_goal_idx").on(table.goalId),
  ],
);

export const decisionRecords = pgTable(
  "decision_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    goalId: uuid("goal_id").references(() => growthGoals.id, {
      onDelete: "set null",
    }),
    planId: uuid("plan_id").references(() => growthPlans.id, {
      onDelete: "set null",
    }),
    actionId: uuid("action_id"),
    decisionType: text("decision_type").notNull(),
    recommendation: text("recommendation").notNull(),
    rationale: text("rationale").notNull().default(""),
    supportingEvidence: text("supporting_evidence").notNull().default(""),
    evidenceWindow: text("evidence_window").notNull().default(""),
    confidence: integer("confidence").notNull().default(0),
    alternatives: text("alternatives").notNull().default(""),
    userResponse: text("user_response").notNull().default(""),
    approvalStatus: text("approval_status").notNull().default("none"),
    resultingAction: text("resulting_action").notNull().default(""),
    outcome: text("outcome").notNull().default(""),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("decision_records_org_idx").on(table.organizationId),
    index("decision_records_goal_idx").on(table.goalId),
  ],
);

export const growthActions = pgTable(
  "growth_actions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    goalId: uuid("goal_id").references(() => growthGoals.id, {
      onDelete: "set null",
    }),
    planId: uuid("plan_id").references(() => growthPlans.id, {
      onDelete: "set null",
    }),
    module: text("module").notNull().default(""),
    actionType: text("action_type").notNull().default(""),
    description: text("description").notNull(),
    status: text("status").notNull().default("proposed"),
    risk: text("risk").notNull().default("optimization"),
    proposedBy: uuid("proposed_by").references(() => users.id),
    proposedAt: timestamp("proposed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    executedAt: timestamp("executed_at", { withTimezone: true }),
    provider: text("provider").notNull().default(""),
    externalId: text("external_id").notNull().default(""),
    result: text("result").notNull().default(""),
    error: text("error").notNull().default(""),
    rollbackAvailable: boolean("rollback_available").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    index("growth_actions_org_idx").on(table.organizationId),
    index("growth_actions_goal_idx").on(table.goalId),
  ],
);

export const growthSettings = pgTable("growth_settings", {
  organizationId: uuid("organization_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  autonomyLevel: integer("autonomy_level").notNull().default(2),
  reviewFrequency: text("review_frequency").notNull().default("weekly"),
  reviewDay: text("review_day").notNull().default("monday"),
  reviewTime: text("review_time").notNull().default("10:00"),
  timezone: text("timezone").notNull().default("America/New_York"),
  recommendedFrequency: text("recommended_frequency").notNull().default(""),
  ...timestamps,
});

export const evidencePolicies = pgTable(
  "evidence_policies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(),
    minElapsedDays: integer("min_elapsed_days").notNull().default(7),
    minObservations: integer("min_observations").notNull().default(0),
    minConversions: integer("min_conversions").notNull().default(0),
    notes: text("notes").notNull().default(""),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("evidence_policies_org_channel_idx").on(
      table.organizationId,
      table.channel,
    ),
    index("evidence_policies_org_idx").on(table.organizationId),
  ],
);

