"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import { executionRequests, growthActions } from "@/lib/db/schema";
import { planExecutionRequest } from "@/lib/execute/requests";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession } from "@/lib/require-org";

const executionSchema = z.object({
  actionId: z.string().uuid(),
  note: z.string().trim().max(2000).optional().default(""),
});

function revalidateExecution() {
  revalidatePath("/app/next-step");
  revalidatePath("/app/work");
  revalidatePath("/app/intelligence");
  revalidatePath("/app");
}

export async function createExecutionRequest(
  formData: FormData,
): Promise<ActionResult> {
  return runAction("Could not save that later-run request.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "approve_actions")) {
      throw new Error("You do not have permission to save later-run requests.");
    }
    const parsed = executionSchema.parse({
      actionId: formData.get("actionId") ?? "",
      note: formData.get("note") ?? "",
    });
    const db = getDb();
    if (!db) throw new Error("Database is not configured");
    const [action] = await db
      .select({
        id: growthActions.id,
        title: growthActions.title,
        description: growthActions.description,
        module: growthActions.module,
        actionType: growthActions.actionType,
        status: growthActions.status,
        executedAt: growthActions.executedAt,
        organizationId: growthActions.organizationId,
      })
      .from(growthActions)
      .where(
        and(
          eq(growthActions.id, parsed.actionId),
          eq(growthActions.organizationId, session.organizationId),
        ),
      )
      .limit(1);
    if (!action || action.organizationId !== session.organizationId) {
      throw new Error("Pick approved work first.");
    }
    const request = planExecutionRequest({
      organizationId: session.organizationId,
      action,
      note: parsed.note,
    });
    const now = new Date();
    const [row] = await db
      .insert(executionRequests)
      .values({
        organizationId: session.organizationId,
        actionId: request.actionId,
        title: request.title,
        note: request.note,
        status: request.status,
        source: request.source,
        createdBy: session.userId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [executionRequests.organizationId, executionRequests.actionId],
        set: {
          title: request.title,
          note: request.note,
          status: request.status,
          source: request.source,
          updatedAt: now,
        },
      })
      .returning({ id: executionRequests.id });
    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "execution_request.saved",
      targetType: "execution_request",
      targetId: row?.id ?? session.organizationId,
    });
    revalidateExecution();
    return "Later-run request saved. GroovGro did not run it, buy ads, or change the live website.";
  });
}
