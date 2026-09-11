"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import { contentBriefs } from "@/lib/db/schema";
import { planContentBrief } from "@/lib/growth/content-briefs";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession } from "@/lib/require-org";

const briefSchema = z.object({
  query: z.string().trim().max(200).optional().default(""),
  title: z.string().trim().max(200).optional().default(""),
  audience: z.string().trim().max(200).optional().default(""),
  outline: z.string().trim().max(2000).optional().default(""),
});

function revalidateContentBriefs() {
  revalidatePath("/app/seo");
  revalidatePath("/app/intelligence");
  revalidatePath("/app/next-step");
  revalidatePath("/app");
}

export async function createContentBrief(formData: FormData): Promise<ActionResult> {
  return runAction("Could not save that content brief.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "manage_seo")) {
      throw new Error("You do not have permission to save content briefs.");
    }
    const parsed = briefSchema.parse({
      query: formData.get("query") ?? "",
      title: formData.get("title") ?? "",
      audience: formData.get("audience") ?? "",
      outline: formData.get("outline") ?? "",
    });
    const draft = planContentBrief({
      organizationId: session.organizationId,
      query: parsed.query,
      title: parsed.title,
      audience: parsed.audience,
      outline: parsed.outline,
    });
    const db = getDb();
    if (!db) throw new Error("Database is not configured");
    const [row] = await db
      .insert(contentBriefs)
      .values({
        organizationId: session.organizationId,
        queryKey: draft.queryKey,
        query: draft.query,
        title: draft.title,
        audience: draft.audience,
        outline: draft.outline,
        status: draft.status,
        source: draft.source,
        createdBy: session.userId,
      })
      .returning({ id: contentBriefs.id });
    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "content_brief.created",
      targetType: "content_brief",
      targetId: row?.id ?? session.organizationId,
    });
    revalidateContentBriefs();
    return "Content brief saved to the planner. GroovGro did not write a page.";
  });
}
