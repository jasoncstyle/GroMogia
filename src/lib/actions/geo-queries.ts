"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import { geoQueries } from "@/lib/db/schema";
import { planGeoQuery } from "@/lib/geo/queries";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession } from "@/lib/require-org";

const querySchema = z.object({
  query: z.string().trim().min(1).max(200),
  why: z.string().trim().max(2000).optional().default(""),
});

function revalidateGeoQueries() {
  revalidatePath("/app/seo");
  revalidatePath("/app/intelligence");
  revalidatePath("/app/next-step");
  revalidatePath("/app");
}

export async function createGeoQuery(formData: FormData): Promise<ActionResult> {
  return runAction("Could not save that question.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "manage_seo")) {
      throw new Error("You do not have permission to save AI visibility questions.");
    }
    const parsed = querySchema.parse({
      query: formData.get("query") ?? "",
      why: formData.get("why") ?? "",
    });
    const draft = planGeoQuery({
      organizationId: session.organizationId,
      query: parsed.query,
      why: parsed.why,
    });
    const db = getDb();
    if (!db) throw new Error("Database is not configured");
    const now = new Date();
    const [row] = await db
      .insert(geoQueries)
      .values({
        organizationId: session.organizationId,
        queryKey: draft.queryKey,
        query: draft.query,
        why: draft.why,
        status: draft.status,
        source: draft.source,
        createdBy: session.userId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [geoQueries.organizationId, geoQueries.queryKey],
        set: {
          query: draft.query,
          why: draft.why,
          status: draft.status,
          source: draft.source,
          updatedAt: now,
        },
      })
      .returning({ id: geoQueries.id });
    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "geo_query.saved",
      targetType: "geo_query",
      targetId: row?.id ?? session.organizationId,
    });
    revalidateGeoQueries();
    return "Question saved to the library. GroovGro did not ask an AI system.";
  });
}
