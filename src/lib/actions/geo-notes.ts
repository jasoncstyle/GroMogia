"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import { geoNotes } from "@/lib/db/schema";
import { planGeoNote } from "@/lib/geo/notes";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession } from "@/lib/require-org";

const noteSchema = z.object({
  query: z.string().trim().max(200).optional().default(""),
  place: z.string().trim().max(200).optional().default(""),
  heard: z.string().trim().min(1).max(500),
  note: z.string().trim().max(2000).optional().default(""),
});

function revalidateGeoNotes() {
  revalidatePath("/app/seo");
  revalidatePath("/app/intelligence");
  revalidatePath("/app/next-step");
  revalidatePath("/app");
}

export async function createGeoNote(formData: FormData): Promise<ActionResult> {
  return runAction("Could not save that AI visibility note.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "manage_seo")) {
      throw new Error("You do not have permission to save AI visibility notes.");
    }
    const parsed = noteSchema.parse({
      query: formData.get("query") ?? "",
      place: formData.get("place") ?? "",
      heard: formData.get("heard") ?? "",
      note: formData.get("note") ?? "",
    });
    const draft = planGeoNote({
      organizationId: session.organizationId,
      query: parsed.query,
      place: parsed.place,
      heard: parsed.heard,
      note: parsed.note,
    });
    const db = getDb();
    if (!db) throw new Error("Database is not configured");
    const [row] = await db
      .insert(geoNotes)
      .values({
        organizationId: session.organizationId,
        queryKey: draft.queryKey,
        query: draft.query,
        place: draft.place,
        heard: draft.heard,
        note: draft.note,
        source: draft.source,
        createdBy: session.userId,
      })
      .returning({ id: geoNotes.id });
    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "geo_note.created",
      targetType: "geo_note",
      targetId: row?.id ?? session.organizationId,
    });
    revalidateGeoNotes();
    return "AI visibility note saved. GroovGro did not ask an AI system.";
  });
}
