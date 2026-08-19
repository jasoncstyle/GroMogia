"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getAppSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { brandSettings, organizations } from "@/lib/db/schema";
import { hasPermission } from "@/lib/permissions";

const brandSchema = z.object({
  businessName: z.string().min(1).max(120),
  description: z.string().max(2000).optional().default(""),
  targetCustomers: z.string().max(500).optional().default(""),
});

export async function updateBrandSettings(formData: FormData): Promise<ActionResult> {
  return runAction("Could not save brand settings.", async () => {
  const session = await getAppSession();
  if (!session.organizationId || !session.userId) {
    throw new Error("Sign in and connect the database before saving brand settings.");
  }
  if (!hasPermission(session.permissions, "manage_brand")) {
    throw new Error("You do not have permission to manage brand settings.");
  }

  const parsed = brandSchema.parse({
    businessName: formData.get("businessName"),
    description: formData.get("description") ?? "",
    targetCustomers: formData.get("targetCustomers") ?? "",
  });

  const db = getDb();
  if (!db) throw new Error("Database is not configured");

  await db
    .insert(brandSettings)
    .values({
      organizationId: session.organizationId,
      businessName: parsed.businessName,
      description: parsed.description,
      targetCustomers: parsed.targetCustomers,
    })
    .onConflictDoUpdate({
      target: brandSettings.organizationId,
      set: {
        businessName: parsed.businessName,
        description: parsed.description,
        targetCustomers: parsed.targetCustomers,
        updatedAt: new Date(),
      },
    });

  await db
    .update(organizations)
    .set({ name: parsed.businessName, updatedAt: new Date() })
    .where(eq(organizations.id, session.organizationId));

  await recordAudit({
    organizationId: session.organizationId,
    actorUserId: session.userId,
    action: "brand.updated",
    targetType: "brand_settings",
    targetId: session.organizationId,
  });

  revalidatePath("/app/settings/brand");
  revalidatePath("/app");
    return "Brand saved";
  });
}
