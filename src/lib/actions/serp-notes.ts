"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import { serpNotes } from "@/lib/db/schema";
import { planSerpNote } from "@/lib/growth/serp-notes";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession } from "@/lib/require-org";

const noteSchema = z.object({
  query: z.string().trim().max(200).optional().default(""),
  competitorName: z.string().trim().min(1).max(200),
  note: z.string().trim().max(2000).optional().default(""),
});

function revalidateSerpNotes() {
  revalidatePath("/app/seo");
  revalidatePath("/app/intelligence");
  revalidatePath("/app/next-step");
  revalidatePath("/app");
}

export async function createSerpNote(formData: FormData): Promise<ActionResult> {
  return runAction("Could not save that competitor note.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "manage_seo")) {
      throw new Error("You do not have permission to save competitor notes.");
    }
    const parsed = noteSchema.parse({
      query: formData.get("query") ?? "",
      competitorName: formData.get("competitorName") ?? "",
      note: formData.get("note") ?? "",
    });
    const draft = planSerpNote({
      organizationId: session.organizationId,
      query: parsed.query,
      competitorName: parsed.competitorName,
      note: parsed.note,
    });
    const db = getDb();
    if (!db) throw new Error("Database is not configured");
    const [row] = await db
      .insert(serpNotes)
      .values({
        organizationId: session.organizationId,
        queryKey: draft.queryKey,
        query: draft.query,
        competitorName: draft.competitorName,
        note: draft.note,
        source: draft.source,
        createdBy: session.userId,
      })
      .returning({ id: serpNotes.id });
    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "serp_note.created",
      targetType: "serp_note",
      targetId: row?.id ?? session.organizationId,
    });
    revalidateSerpNotes();
    return "Competitor note saved. GroovGro did not look anyone up.";
  });
}
