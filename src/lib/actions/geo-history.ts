"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import { geoHistory, geoQueries } from "@/lib/db/schema";
import { GEO_ANSWER_UNSURE, GEO_ANSWERS, planGeoHistory } from "@/lib/geo/history";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession } from "@/lib/require-org";

const historySchema = z.object({
  queryId: z.string().uuid(),
  mentioned: z.enum(GEO_ANSWERS),
  cited: z.enum(GEO_ANSWERS).optional().default(GEO_ANSWER_UNSURE),
  note: z.string().trim().max(2000).optional().default(""),
});

function revalidateGeoHistory() {
  revalidatePath("/app/seo");
  revalidatePath("/app/intelligence");
  revalidatePath("/app/next-step");
  revalidatePath("/app");
}

export async function createGeoHistory(formData: FormData): Promise<ActionResult> {
  return runAction("Could not save that visibility history.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "manage_seo")) {
      throw new Error("You do not have permission to save AI visibility history.");
    }
    const parsed = historySchema.parse({
      queryId: formData.get("queryId") ?? "",
      mentioned: formData.get("mentioned") ?? "",
      cited: formData.get("cited") ?? GEO_ANSWER_UNSURE,
      note: formData.get("note") ?? "",
    });
    const db = getDb();
    if (!db) throw new Error("Database is not configured");
    const [library] = await db
      .select({
        id: geoQueries.id,
        query: geoQueries.query,
        queryKey: geoQueries.queryKey,
        organizationId: geoQueries.organizationId,
      })
      .from(geoQueries)
      .where(
        and(
          eq(geoQueries.id, parsed.queryId),
          eq(geoQueries.organizationId, session.organizationId),
        ),
      )
      .limit(1);
    if (!library || library.organizationId !== session.organizationId) {
      throw new Error("Pick a saved library question first.");
    }
    const draft = planGeoHistory({
      organizationId: session.organizationId,
      queryId: library.id,
      query: library.query,
      queryKey: library.queryKey,
      mentioned: parsed.mentioned,
      cited: parsed.cited,
      note: parsed.note,
    });
    const now = new Date();
    const [row] = await db
      .insert(geoHistory)
      .values({
        organizationId: session.organizationId,
        queryId: draft.queryId,
        queryKey: draft.queryKey,
        query: draft.query,
        mentioned: draft.mentioned,
        cited: draft.cited,
        note: draft.note,
        source: draft.source,
        observedAt: now,
        createdBy: session.userId,
        updatedAt: now,
      })
      .returning({ id: geoHistory.id });
    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "geo_history.created",
      targetType: "geo_history",
      targetId: row?.id ?? session.organizationId,
    });
    revalidateGeoHistory();
    return "Visibility history saved. GroovGro did not ask an AI system.";
  });
}
