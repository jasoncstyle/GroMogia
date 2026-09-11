"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import { contentBriefs, contentDrafts } from "@/lib/db/schema";
import { planContentDraft } from "@/lib/growth/content-drafts";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession } from "@/lib/require-org";

const draftSchema = z.object({
  briefId: z.string().uuid(),
});

function revalidateContentDrafts() {
  revalidatePath("/app/seo");
  revalidatePath("/app/intelligence");
  revalidatePath("/app/next-step");
  revalidatePath("/app");
}

export async function createContentDraft(formData: FormData): Promise<ActionResult> {
  return runAction("Could not write that workspace draft.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "manage_seo")) {
      throw new Error("You do not have permission to write content drafts.");
    }
    const parsed = draftSchema.parse({
      briefId: formData.get("briefId") ?? "",
    });
    const db = getDb();
    if (!db) throw new Error("Database is not configured");
    const [brief] = await db
      .select({
        id: contentBriefs.id,
        title: contentBriefs.title,
        query: contentBriefs.query,
        audience: contentBriefs.audience,
        outline: contentBriefs.outline,
      })
      .from(contentBriefs)
      .where(
        and(
          eq(contentBriefs.id, parsed.briefId),
          eq(contentBriefs.organizationId, session.organizationId),
        ),
      )
      .limit(1);
    if (!brief) {
      throw new Error("That brief is not in this workspace.");
    }
    const draft = planContentDraft({
      organizationId: session.organizationId,
      briefId: brief.id,
      title: brief.title,
      query: brief.query,
      audience: brief.audience,
      outline: brief.outline,
    });
    const now = new Date();
    const [row] = await db
      .insert(contentDrafts)
      .values({
        organizationId: session.organizationId,
        briefId: draft.briefId,
        title: draft.title,
        body: draft.body,
        status: draft.status,
        source: draft.source,
        createdBy: session.userId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [contentDrafts.organizationId, contentDrafts.briefId],
        set: {
          title: draft.title,
          body: draft.body,
          status: draft.status,
          source: draft.source,
          updatedAt: now,
        },
      })
      .returning({ id: contentDrafts.id });
    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "content_draft.created",
      targetType: "content_draft",
      targetId: row?.id ?? session.organizationId,
    });
    revalidateContentDrafts();
    return "Workspace draft saved. GroovGro did not publish it or change the live website.";
  });
}
