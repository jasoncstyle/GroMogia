import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  brandSettings,
  featureFlags,
  integrationProviders,
  leadStages,
  modules,
  organizationModules,
  permissions,
  roles,
} from "@/lib/db/schema";
import {
  ENABLED_BY_DEFAULT_MODULES,
  MODULE_CATALOG,
} from "@/lib/modules/catalog";
import { PERMISSIONS, ROLE_PERMISSIONS, SYSTEM_ROLES } from "@/lib/permissions";
import { DEFAULT_LEAD_STAGES } from "@/modules/crm/stages";
import { KNOWN_PROVIDERS } from "@/modules/integrations/types";

export async function ensureCatalog(): Promise<void> {
  const db = getDb();
  if (!db) return;

  for (const permission of PERMISSIONS) {
    await db
      .insert(permissions)
      .values({
        id: permission,
        description: permission.replaceAll("_", " "),
      })
      .onConflictDoNothing();
  }

  for (const catalogModule of MODULE_CATALOG) {
    await db
      .insert(modules)
      .values({
        id: catalogModule.id,
        name: catalogModule.name,
        description: catalogModule.description,
        phaseIntroduced: catalogModule.phase,
      })
      .onConflictDoUpdate({
        target: modules.id,
        set: {
          name: catalogModule.name,
          description: catalogModule.description,
          phaseIntroduced: catalogModule.phase,
        },
      });
  }

  for (const provider of KNOWN_PROVIDERS) {
    await db
      .insert(integrationProviders)
      .values({
        key: provider.key,
        name: provider.name,
        capabilities: [...provider.capabilities],
      })
      .onConflictDoNothing();
  }

  for (const flag of [
    {
      key: "phase_1_foundation",
      description: "Foundation shell, settings, and module entitlements",
    },
    {
      key: "phase_2_business_data",
      description: "Website connection, CRM, events, Stripe, and analytics",
    },
    {
      key: "phase_3_attribution",
      description: "Campaign to lead to customer to revenue",
    },
  ]) {
    await db
      .insert(featureFlags)
      .values({
        key: flag.key,
        description: flag.description,
        enabledGlobally: true,
        enabledForPlatform: true,
      })
      .onConflictDoNothing();
  }
}

export async function ensureOrganizationModules(organizationId: string) {
  const db = getDb();
  if (!db) return;

  for (const moduleId of ENABLED_BY_DEFAULT_MODULES) {
    await db
      .insert(organizationModules)
      .values({
        organizationId,
        moduleId,
        status: "enabled",
        source: "manual",
      })
      .onConflictDoNothing();
  }
}

export async function ensureLeadStages(organizationId: string) {
  const db = getDb();
  if (!db) return;

  const existing = await db
    .select()
    .from(leadStages)
    .where(eq(leadStages.organizationId, organizationId));
  if (existing.length > 0) return;

  for (const stage of DEFAULT_LEAD_STAGES) {
    await db.insert(leadStages).values({
      organizationId,
      key: stage.key,
      name: stage.name,
      sortOrder: stage.sortOrder,
      isWon: stage.isWon,
      isLost: stage.isLost,
    });
  }
}

export async function provisionOrganization(
  organizationId: string,
  organizationName: string,
) {
  const db = getDb();
  if (!db) {
    throw new Error("Database is not configured");
  }

  await db
    .insert(brandSettings)
    .values({
      organizationId,
      businessName: organizationName,
    })
    .onConflictDoNothing();

  const existingRoles = await db
    .select()
    .from(roles)
    .where(eq(roles.organizationId, organizationId));

  for (const key of SYSTEM_ROLES) {
    if (existingRoles.some((role) => role.key === key)) continue;
    await db.insert(roles).values({
      organizationId,
      key,
      name: key.replaceAll("_", " "),
      isSystem: true,
    });
  }

  await ensureOrganizationModules(organizationId);
  await ensureLeadStages(organizationId);

  return ROLE_PERMISSIONS;
}

export async function getEnabledModuleIds(organizationId: string) {
  const db = getDb();
  if (!db) return [...ENABLED_BY_DEFAULT_MODULES];

  const enabled = await db
    .select()
    .from(organizationModules)
    .where(
      and(
        eq(organizationModules.organizationId, organizationId),
        eq(organizationModules.status, "enabled"),
      ),
    );

  return enabled.map((row) => row.moduleId);
}
