import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  brandSettings,
  featureFlags,
  integrationProviders,
  modules,
  permissions,
  roles,
} from "@/lib/db/schema";
import { MODULE_CATALOG } from "@/lib/modules/catalog";
import { PERMISSIONS, ROLE_PERMISSIONS, SYSTEM_ROLES } from "@/lib/permissions";
import { KNOWN_PROVIDERS } from "@/modules/integrations/types";

export async function ensureCatalog(): Promise<void> {
  const db = getDb();
  if (!db) return;

  const existingPermissions = await db.select().from(permissions).limit(1);
  if (existingPermissions.length > 0) {
    return;
  }

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
      .onConflictDoNothing();
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

  await db
    .insert(featureFlags)
    .values({
      key: "phase_1_foundation",
      description: "Foundation shell, settings, and module entitlements",
      enabledGlobally: true,
      enabledForPlatform: true,
    })
    .onConflictDoNothing();
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

  for (const key of SYSTEM_ROLES) {
    const existing = await db
      .select()
      .from(roles)
      .where(eq(roles.organizationId, organizationId));
    if (existing.some((role) => role.key === key)) continue;

    await db.insert(roles).values({
      organizationId,
      key,
      name: key.replaceAll("_", " "),
      isSystem: true,
    });
  }

  return ROLE_PERMISSIONS;
}
