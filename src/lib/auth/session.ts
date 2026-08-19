import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";

import {
  ensureCatalog,
  ensureLeadStages,
  ensureOrganizationModules,
  getEnabledModuleIds,
  provisionOrganization,
} from "@/lib/db/bootstrap";
import { getDb } from "@/lib/db";
import { ensureSchema } from "@/lib/db/ensure-schema";
import { memberships, organizations, users } from "@/lib/db/schema";
import { isClerkConfigured, isDatabaseConfigured } from "@/lib/env";
import { ENABLED_BY_DEFAULT_MODULES } from "@/lib/modules/catalog";
import { ROLE_PERMISSIONS } from "@/lib/permissions";

export type AppSession = {
  setupIncomplete: boolean
  missingServices: string[]
  clerkUserId?: string
  email?: string
  name?: string
  userId?: string
  organizationId?: string
  organizationName?: string
  organizationSlug?: string
  permissions: string[]
  enabledModules: string[]
  isPlatformAdmin: boolean
};

function missingServices(): string[] {
  const missing: string[] = [];
  if (!isClerkConfigured()) missing.push("Clerk");
  if (!isDatabaseConfigured()) missing.push("Neon");
  return missing;
}

export async function getAppSession(): Promise<AppSession> {
  const missing = missingServices();
  if (missing.length > 0) {
    return {
      setupIncomplete: true,
      missingServices: missing,
      permissions: [],
      enabledModules: [...ENABLED_BY_DEFAULT_MODULES],
      isPlatformAdmin: false,
    };
  }

  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return {
      setupIncomplete: false,
      missingServices: [],
      permissions: [],
      enabledModules: [...ENABLED_BY_DEFAULT_MODULES],
      isPlatformAdmin: false,
    };
  }

  const clerkUser = await currentUser();
  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress ??
    "";
  const name =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ||
    clerkUser?.username ||
    email;

  const db = getDb();
  if (!db) {
    return {
      setupIncomplete: true,
      missingServices: ["Neon"],
      clerkUserId,
      email,
      name,
      permissions: [],
      enabledModules: [...ENABLED_BY_DEFAULT_MODULES],
      isPlatformAdmin: false,
    };
  }

  try {
    await ensureSchema();
    await ensureCatalog();

    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
      .limit(1);

    let user = existingUsers[0];
    if (!user) {
      await db.insert(users).values({ clerkUserId, email, name });
      const createdUsers = await db
        .select()
        .from(users)
        .where(eq(users.clerkUserId, clerkUserId))
        .limit(1);
      user = createdUsers[0];
    }
    if (!user) {
      throw new Error("Could not create the GroovGro user record.");
    }

    const existingMemberships = await db
      .select({
        membership: memberships,
        organization: organizations,
      })
      .from(memberships)
      .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
      .where(
        and(eq(memberships.userId, user.id), eq(memberships.status, "active")),
      )
      .limit(1);

    let organization = existingMemberships[0]?.organization;
    if (!organization) {
      const slug = `org-${user.id.slice(0, 8)}`;
      await db.insert(organizations).values({
        slug,
        name: name ? `${name}'s organization` : "New organization",
      });
      const createdOrgs = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, slug))
        .limit(1);
      organization = createdOrgs[0];
      if (!organization) {
        throw new Error("Could not create the organization record.");
      }
      await db.insert(memberships).values({
        organizationId: organization.id,
        userId: user.id,
        status: "active",
      });
      await provisionOrganization(organization.id, organization.name);
    }

    await ensureOrganizationModules(organization.id);
    await ensureLeadStages(organization.id);
    const enabledModules = await getEnabledModuleIds(organization.id);

    return {
      setupIncomplete: false,
      missingServices: [],
      clerkUserId,
      email,
      name,
      userId: user.id,
      organizationId: organization.id,
      organizationName: organization.name,
      organizationSlug: organization.slug,
      permissions: [...ROLE_PERMISSIONS.owner],
      enabledModules,
      isPlatformAdmin: user.platformRole === "super_admin",
    };
  } catch (error) {
    console.error("Failed to load GroovGro workspace", error);
    throw error;
  }
}
