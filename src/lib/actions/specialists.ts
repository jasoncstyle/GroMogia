"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import { decisionRecords, growthActions } from "@/lib/db/schema";
import { getSpecialistReports } from "@/lib/growth/queries";
import { SPECIALIST_IDS, specialistById } from "@/lib/growth/specialists";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession } from "@/lib/require-org";

const schema = z.object({
  specialistId: z.enum(SPECIALIST_IDS),
});

export async function saveSpecialistRecommendation(
  formData: FormData,
): Promise<ActionResult> {
  return runAction("Could not save the specialist recommendation.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "view_decision_history")) {
      throw new Error("You do not have permission to save a decision.");
    }
    const db = getDb();
    if (!db) throw new Error("Database is not configured");

    const { specialistId } = schema.parse({
      specialistId: formData.get("specialistId"),
    });
    const reports = await getSpecialistReports(session.organizationId);
    const report = specialistById(reports, specialistId);
    if (!report) throw new Error("That specialist report is not available.");

    const decisionType =
      report.recommend.kind === "no_change_yet"
        ? "no_change"
        : report.recommend.classification === "operational"
          ? "operational"
          : report.recommend.classification === "strategic"
            ? "strategic"
            : "recommend";

    const decisionId = crypto.randomUUID();
    await db.insert(decisionRecords).values({
      id: decisionId,
      organizationId: session.organizationId,
      goalId: report.relatedGoal?.id ?? null,
      decisionType,
      recommendation: `${report.name}: ${report.recommend.title}`,
      rationale: `${report.analyze} ${report.recommend.body}`,
      supportingEvidence: report.read,
      evidenceWindow: "specialist read / analyze / recommend",
      confidence: report.recommend.kind === "no_change_yet" ? 85 : 65,
      alternatives: "GroovGro did not execute this recommendation.",
      createdBy: session.userId,
    });

    if (
      report.recommend.kind === "recommend" &&
      hasPermission(session.permissions, "modify_goals")
    ) {
      await db.insert(growthActions).values({
        organizationId: session.organizationId,
        goalId: report.relatedGoal?.id ?? null,
        module: report.id,
        actionType: "specialist_recommend",
        description: report.recommend.body,
        status: "proposed",
        risk: report.recommend.classification,
        proposedBy: session.userId,
      });
    }

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "specialist.recommended",
      targetType: "decision_record",
      targetId: decisionId,
      metadata: { specialistId, decisionType, executeAllowed: false },
    });

    revalidatePath("/app/intelligence");
    revalidatePath("/app/decisions");
    revalidatePath("/app/next-step");
    revalidatePath("/app/work");
    revalidatePath("/app");
    return report.recommend.kind === "no_change_yet"
      ? `${report.name} recommendation saved: leave this alone. GroovGro will not execute it.`
      : `${report.name} recommendation saved. GroovGro will not execute it.`;
  });
}
