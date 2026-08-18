import { sql } from "drizzle-orm";
import {
  boolean,
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
