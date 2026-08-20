"use server";

import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import { aiActionLogs } from "@/lib/db/schema";
import {
  buildIntelligenceBrief,
  factsSummary,
} from "@/lib/intelligence/observe";
import { polishBriefNarrative } from "@/lib/intelligence/polish";
import { hasPermission } from "@/lib/permissions";
import { getIntelligenceFacts } from "@/lib/phase4/queries";
import { requireOrgSession } from "@/lib/require-org";

export async function refreshIntelligence(): Promise<ActionResult> {
  return runAction("Could not refresh intelligence.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "view_analytics")) {
      throw new Error("You do not have permission to view intelligence.");
    }

    const db = getDb();
    if (!db) throw new Error("Database is not configured");

    const showFinancials = hasPermission(session.permissions, "view_financials");
    const facts = await getIntelligenceFacts(session.organizationId, {
      showFinancials,
    });
    const brief = buildIntelligenceBrief(facts);
    const { narrative, usedAi } = await polishBriefNarrative(brief);

    await db.insert(aiActionLogs).values({
      organizationId: session.organizationId,
      level: 2,
      actionType: "observe_recommend",
      inputSummary: factsSummary(facts),
      output: JSON.stringify({ brief, narrative, usedAi }),
      status: "observed",
      actorUserId: session.userId,
    });

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "intelligence.observe",
      targetType: "ai_action_log",
      metadata: { usedAi },
    });

    revalidatePath("/app/intelligence");
    return usedAi
      ? "Insight saved. Wording was rewritten in plain language."
      : "Insight saved from connected website, CRM, and Stripe records.";
  });
}
