"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { planCmsPublishRequest } from "@/lib/cms/requests";
import { getDb } from "@/lib/db";
import { cmsPublishRequests, contentDrafts } from "@/lib/db/schema";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession } from "@/lib/require-org";

const publishSchema = z.object({
  draftId: z.string().uuid(),
  note: z.string().trim().max(2000).optional().default(""),
});

function revalidateCmsPublish() {
  revalidatePath("/app/seo");
  revalidatePath("/app/intelligence");
  revalidatePath("/app/next-step");
  revalidatePath("/app");
}

export async function createCmsPublishRequest(
  formData: FormData,
): Promise<ActionResult> {
  return runAction("Could not save that publish request.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "manage_seo")) {
      throw new Error("You do not have permission to save CMS publish requests.");
    }
    const parsed = publishSchema.parse({
      draftId: formData.get("draftId") ?? "",
      note: formData.get("note") ?? "",
    });
    const db = getDb();
    if (!db) throw new Error("Database is not configured");
    const [draft] = await db
      .select({
        id: contentDrafts.id,
        title: contentDrafts.title,
        organizationId: contentDrafts.organizationId,
      })
      .from(contentDrafts)
      .where(
        and(
          eq(contentDrafts.id, parsed.draftId),
          eq(contentDrafts.organizationId, session.organizationId),
        ),
      )
      .limit(1);
    if (!draft || draft.organizationId !== session.organizationId) {
      throw new Error("Pick a workspace draft first.");
    }
    const request = planCmsPublishRequest({
      organizationId: session.organizationId,
      draftId: draft.id,
      title: draft.title,
      note: parsed.note,
    });
    const now = new Date();
    const [row] = await db
      .insert(cmsPublishRequests)
      .values({
        organizationId: session.organizationId,
        draftId: request.draftId,
        title: request.title,
        note: request.note,
        status: request.status,
        source: request.source,
        createdBy: session.userId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [cmsPublishRequests.organizationId, cmsPublishRequests.draftId],
        set: {
          title: request.title,
          note: request.note,
          status: request.status,
          source: request.source,
          updatedAt: now,
        },
      })
      .returning({ id: cmsPublishRequests.id });
    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "cms_publish_request.saved",
      targetType: "cms_publish_request",
      targetId: row?.id ?? session.organizationId,
    });
    revalidateCmsPublish();
    return "Publish request saved. GroovGro did not publish or change the live website.";
  });
}
