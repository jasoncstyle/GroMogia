"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { websites } from "@/lib/db/schema";
import { runAction, type ActionResult } from "@/lib/action-result";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession } from "@/lib/require-org";

const websiteSchema = z.object({
  publicUrl: z.string().trim().max(500),
});

export async function saveWebsiteConnection(formData: FormData): Promise<ActionResult> {
  return runAction("Could not save the website.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "manage_website")) {
      throw new Error("You do not have permission to connect a website.");
    }

  const parsed = websiteSchema.parse({
    publicUrl: formData.get("publicUrl") ?? "",
  });

  let publicUrl = parsed.publicUrl;
  if (publicUrl && !/^https?:\/\//i.test(publicUrl)) {
    publicUrl = `https://${publicUrl}`;
  }

  const db = getDb();
  if (!db) throw new Error("Database is not configured");

  const existing = await db
    .select()
    .from(websites)
    .where(eq(websites.organizationId, session.organizationId))
    .limit(1);

  if (existing[0]) {
    await db
      .update(websites)
      .set({
        publicUrl,
        kind: "connected",
        status: publicUrl ? "active" : "draft",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(websites.id, existing[0].id),
          eq(websites.organizationId, session.organizationId),
        ),
      );
  } else {
    await db.insert(websites).values({
      organizationId: session.organizationId,
      kind: "connected",
      publicUrl,
      provider: "other",
      trackingId: crypto.randomUUID(),
      status: publicUrl ? "active" : "draft",
    });
  }

  await recordAudit({
    organizationId: session.organizationId,
    actorUserId: session.userId,
    action: "website.connected",
    targetType: "website",
    metadata: { publicUrl },
  });

  revalidatePath("/app/website");
  revalidatePath("/app");
  revalidatePath("/app/analytics");
    return "Website saved";
  });
}
