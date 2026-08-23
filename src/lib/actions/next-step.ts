"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import { decisionRecords, growthActions } from "@/lib/db/schema";
import { getCoordinatedNextStep } from "@/lib/growth/queries";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession } from "@/lib/require-org";

function revalidateNextStep() {
  revalidatePath("/app");
  revalidatePath("/app/next-step");
  revalidatePath("/app/decisions");
  revalidatePath("/app/intelligence");
  revalidatePath("/app/growth-review");
}

async function requireActionEditor() {
  const session = await requireOrgSession();
  const db = getDb();
  if (!db) throw new Error("Database is not configured");
  return { session, db };
}

export async function saveNextStepResponse(
  formData: FormData,
): Promise<ActionResult> {
  return runAction("Could not save that next step.", async () => {
    const { session, db } = await requireActionEditor();
    if (!hasPermission(session.permissions, "view_decision_history")) {
      throw new Error("You do not have permission to save a decision.");
    }

    const response = z.enum(["do_this", "leave_alone"]).parse(formData.get("response"));
    const coordinated = await getCoordinatedNextStep(session.organizationId);
    if (!coordinated) throw new Error("Sign in to save a next step.");
    const primary = coordinated.primary;

    const leaveAlone = response === "leave_alone" || primary.kind === "no_change_yet";
    const decisionId = crypto.randomUUID();
    await db.insert(decisionRecords).values({
      id: decisionId,
      organizationId: session.organizationId,
      goalId: primary.goalId,
      decisionType: leaveAlone
        ? "no_change"
        : primary.classification === "operational"
          ? "operational"
          : primary.classification === "strategic"
            ? "strategic"
            : "recommend",
      recommendation: leaveAlone
        ? `Leave this alone: ${primary.title}`
        : primary.title,
      rationale: primary.body,
      supportingEvidence: coordinated.leftAlone.map((item) => item.title).join("; "),
      evidenceWindow: "coordinated next step",
      confidence: leaveAlone ? 85 : 65,
      alternatives: "GroovGro did not execute this.",
      userResponse: leaveAlone ? "leave_alone" : "accepted",
      approvalStatus: leaveAlone ? "none" : "approved",
      createdBy: session.userId,
    });

    if (!leaveAlone && hasPermission(session.permissions, "modify_goals")) {
      const already = coordinated.waitingActions.some(
        (action) =>
          action.description === primary.body &&
          action.module === (primary.specialistId ?? ""),
      );
      if (!already) {
        await db.insert(growthActions).values({
          organizationId: session.organizationId,
          goalId: primary.goalId,
          module: primary.specialistId ?? primary.source,
          actionType: "next_step",
          description: primary.body,
          status: "proposed",
          risk: primary.classification,
          proposedBy: session.userId,
        });
      }
    }

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: leaveAlone ? "next_step.left_alone" : "next_step.accepted",
      targetType: "decision_record",
      targetId: decisionId,
      metadata: { href: primary.href, executeAllowed: false },
    });
    revalidateNextStep();
    return leaveAlone
      ? "GroovGro recorded that nothing should change yet. It did not execute anything."
      : "Next step saved. GroovGro will not execute it. Open the linked page when you are ready.";
  });
}

const actionIdSchema = z.object({
  actionId: z.string().uuid(),
});

export async function approveGrowthAction(
  formData: FormData,
): Promise<ActionResult> {
  return runAction("Could not approve that action.", async () => {
    const { session, db } = await requireActionEditor();
    if (!hasPermission(session.permissions, "approve_actions")) {
      throw new Error("You do not have permission to approve an action.");
    }
    const { actionId } = actionIdSchema.parse({
      actionId: formData.get("actionId"),
    });

    const [action] = await db
      .select()
      .from(growthActions)
      .where(
        and(
          eq(growthActions.id, actionId),
          eq(growthActions.organizationId, session.organizationId),
        ),
      )
      .limit(1);
    if (!action) throw new Error("That proposed action was not found.");

    await db
      .update(growthActions)
      .set({
        status: "approved",
        approvedBy: session.userId,
        approvedAt: new Date(),
        result: "Approved by the owner. GroovGro did not execute this.",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(growthActions.id, action.id),
          eq(growthActions.organizationId, session.organizationId),
        ),
      );

    await db.insert(decisionRecords).values({
      organizationId: session.organizationId,
      goalId: action.goalId,
      actionId: action.id,
      decisionType: action.risk === "operational" ? "operational" : "recommend",
      recommendation: action.description,
      rationale: "The owner approved this proposed action. GroovGro did not execute it.",
      evidenceWindow: "coordinated next step",
      userResponse: "approved",
      approvalStatus: "approved",
      resultingAction: "none",
      createdBy: session.userId,
    });

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "growth_action.approved",
      targetType: "growth_action",
      targetId: action.id,
      metadata: { executed: false },
    });
    revalidateNextStep();
    return "Action approved. GroovGro did not run it, send email, change ads, or edit the live website.";
  });
}

export async function rejectGrowthAction(
  formData: FormData,
): Promise<ActionResult> {
  return runAction("Could not reject that action.", async () => {
    const { session, db } = await requireActionEditor();
    if (!hasPermission(session.permissions, "approve_actions")) {
      throw new Error("You do not have permission to reject an action.");
    }
    const { actionId } = actionIdSchema.parse({
      actionId: formData.get("actionId"),
    });

    const [action] = await db
      .select()
      .from(growthActions)
      .where(
        and(
          eq(growthActions.id, actionId),
          eq(growthActions.organizationId, session.organizationId),
        ),
      )
      .limit(1);
    if (!action) throw new Error("That proposed action was not found.");

    await db
      .update(growthActions)
      .set({
        status: "rejected",
        result: "Rejected by the owner. GroovGro did not execute this.",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(growthActions.id, action.id),
          eq(growthActions.organizationId, session.organizationId),
        ),
      );

    await db.insert(decisionRecords).values({
      organizationId: session.organizationId,
      goalId: action.goalId,
      actionId: action.id,
      decisionType: "no_change",
      recommendation: action.description,
      rationale: "The owner rejected this proposed action.",
      evidenceWindow: "coordinated next step",
      userResponse: "rejected",
      approvalStatus: "rejected",
      resultingAction: "none",
      createdBy: session.userId,
    });

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "growth_action.rejected",
      targetType: "growth_action",
      targetId: action.id,
      metadata: { executed: false },
    });
    revalidateNextStep();
    return "Action rejected. GroovGro did not run it.";
  });
}
