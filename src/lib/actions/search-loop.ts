"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import { decisionRecords, growthActions } from "@/lib/db/schema";
import {
  GROWTH_ACTION_CONFIDENCE_OBSERVED,
  GROWTH_ACTION_IMPACT_UNKNOWN,
} from "@/lib/growth/action-evidence";
import { OWNER_DONE_STATUS } from "@/lib/growth/owner-work";
import { getKeywordHistory } from "@/lib/growth/persist-keywords";
import { getGrowthSnapshot } from "@/lib/growth/queries";
import {
  SEARCH_LOOP_ACTION,
  SEARCH_LOOP_KIND,
  encodeSearchBaseline,
} from "@/lib/growth/search-loop";
import { SEO_MODULE } from "@/lib/growth/seo-actions";
import { encodeWorkBaseline } from "@/lib/growth/work-learning";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession } from "@/lib/require-org";

function revalidateSearchLoop() {
  revalidatePath("/app/seo");
  revalidatePath("/app/intelligence");
  revalidatePath("/app/next-step");
  revalidatePath("/app/work");
  revalidatePath("/app/goals");
  revalidatePath("/app/decisions");
  revalidatePath("/app");
}

const pasteSchema = z.object({
  query: z.string().trim().min(1).max(200),
  briefId: z.string().uuid().optional().or(z.literal("")),
  draftId: z.string().uuid().optional().or(z.literal("")),
  pageUrl: z.string().trim().max(500).optional().default(""),
  goalId: z.string().uuid().optional().or(z.literal("")),
});

function searchLoopExternalId(query: string): string {
  return `${SEARCH_LOOP_ACTION}:${query.trim().toLowerCase().replace(/\s+/g, " ")}`;
}

export async function markSearchLoopPasted(
  formData: FormData,
): Promise<ActionResult> {
  return runAction("Could not save that you pasted that search copy.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "manage_seo")) {
      throw new Error("You do not have permission to mark this search work done.");
    }
    const parsed = pasteSchema.parse({
      query: formData.get("query") ?? "",
      briefId: formData.get("briefId") ?? "",
      draftId: formData.get("draftId") ?? "",
      pageUrl: formData.get("pageUrl") ?? "",
      goalId: formData.get("goalId") ?? "",
    });
    const db = getDb();
    if (!db) throw new Error("Database is not configured");
    const query = parsed.query.replace(/\s+/g, " ").trim();
    const externalId = searchLoopExternalId(query);
    const [existing] = await db
      .select({
        id: growthActions.id,
        status: growthActions.status,
        result: growthActions.result,
      })
      .from(growthActions)
      .where(
        and(
          eq(growthActions.organizationId, session.organizationId),
          eq(growthActions.externalId, externalId),
        ),
      )
      .limit(1);
    if (existing) {
      return "Already saved that you pasted this search copy. Check what changed on Next step. GroovGro did not publish or change the live website.";
    }

    const snapshot = await getGrowthSnapshot(session.organizationId);
    const goalId = parsed.goalId || snapshot?.activeGoals[0]?.id || null;
    const goal = goalId
      ? snapshot?.goals.find((row) => row.id === goalId) ??
        snapshot?.activeGoals.find((row) => row.id === goalId)
      : null;
    const keywords = await getKeywordHistory(db, session.organizationId);
    const keyword = keywords.find(
      (row) => row.query.trim().toLowerCase() === query.toLowerCase(),
    );
    const latest = keyword?.points[keyword.points.length - 1];
    const metrics = {
      impressions: latest?.impressions ?? 0,
      clicks: latest?.clicks ?? 0,
      position: latest?.position ?? 0,
      ctr: latest?.ctr ?? 0,
    };
    const goalBaseline = goal
      ? encodeWorkBaseline({
          value: goal.liveCurrentValue,
          targetValue: goal.targetValue,
          unit: goal.unit ?? "",
        })
      : "";
    const searchBaseline = encodeSearchBaseline(query, metrics);
    const description = [
      `Paste workspace copy for “${query}” onto the existing website.`,
      parsed.pageUrl ? `Page: ${parsed.pageUrl}` : "",
      "The owner pasted this. GroovGro did not publish or change the live website.",
    ]
      .filter(Boolean)
      .join("\n");
    const result = [
      "The owner pasted this search copy on the existing website. GroovGro did not publish or change the live site.",
      goalBaseline,
      searchBaseline,
    ]
      .filter(Boolean)
      .join("\n");

    const now = new Date();
    const [row] = await db
      .insert(growthActions)
      .values({
        organizationId: session.organizationId,
        goalId,
        module: SEO_MODULE,
        actionType: SEARCH_LOOP_ACTION,
        title: `Paste search copy for “${query}”`,
        description,
        evidence: {
          source: "search_console",
          kind: SEARCH_LOOP_KIND,
          query,
          pageUrl: parsed.pageUrl,
          impressions: metrics.impressions,
          clicks: metrics.clicks,
          position: metrics.position,
          ctr: metrics.ctr,
          briefId: parsed.briefId || undefined,
          draftId: parsed.draftId || undefined,
          why: "Owner finished the search-to-page loop.",
          recommend: "Check stored Search Console numbers and the Goal after a week.",
        },
        confidence: GROWTH_ACTION_CONFIDENCE_OBSERVED,
        expectedImpact: GROWTH_ACTION_IMPACT_UNKNOWN,
        priority: 0,
        status: OWNER_DONE_STATUS,
        risk: "optimization",
        proposedBy: session.userId,
        proposedAt: now,
        approvedBy: session.userId,
        approvedAt: now,
        executedAt: null,
        provider: "owner",
        externalId,
        result,
      })
      .returning({ id: growthActions.id });

    await db.insert(decisionRecords).values({
      organizationId: session.organizationId,
      goalId,
      actionId: row?.id,
      decisionType: "recommend",
      recommendation: description,
      rationale:
        "The owner pasted search copy on the existing website. GroovGro did not publish it.",
      supportingEvidence: [goalBaseline, searchBaseline].filter(Boolean).join("\n"),
      evidenceWindow: "search-to-page loop",
      userResponse: "completed",
      approvalStatus: "approved",
      resultingAction: "owner_completed",
      createdBy: session.userId,
    });

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "growth_action.completed_by_owner",
      targetType: "growth_action",
      targetId: row?.id ?? session.organizationId,
      metadata: {
        executed: false,
        executedAt: null,
        kind: SEARCH_LOOP_KIND,
        query,
      },
    });
    revalidateSearchLoop();
    return "Saved. GroovGro recorded that you pasted this on your site. It did not publish, scrape Google, or change checkout. Check what changed on Next step after Search Console has a newer snapshot.";
  });
}
