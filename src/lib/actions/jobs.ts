"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import { scheduledJobs } from "@/lib/db/schema";
import { isScheduledTaskKey, scheduledTaskByKey } from "@/lib/jobs/catalog";
import { isScheduleFrequency, nextRunAt } from "@/lib/jobs/schedule";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession } from "@/lib/require-org";

export async function saveTaskSchedule(formData: FormData): Promise<ActionResult> {
  return runAction("Could not save that schedule.", async () => {
    const session = await requireOrgSession();
    const taskKey = String(formData.get("taskKey") ?? "").trim();
    const frequencyRaw = String(formData.get("frequency") ?? "off").trim();
    if (!isScheduledTaskKey(taskKey)) {
      throw new Error("That refresh is not on the schedule list.");
    }
    if (!isScheduleFrequency(frequencyRaw)) {
      throw new Error("Choose manual only, every day, or every week.");
    }
    const task = scheduledTaskByKey(taskKey);
    if (
      task &&
      !hasPermission(session.permissions, task.permission) &&
      !hasPermission(session.permissions, "manage_settings")
    ) {
      throw new Error("You do not have permission to schedule that refresh.");
    }

    const db = getDb();
    if (!db) throw new Error("Database is not configured");

    const [current] = await db
      .select()
      .from(scheduledJobs)
      .where(
        and(
          eq(scheduledJobs.organizationId, session.organizationId),
          eq(scheduledJobs.taskKey, taskKey),
        ),
      )
      .limit(1);

    const next = nextRunAt(frequencyRaw);
    const values = {
      frequency: frequencyRaw,
      nextRunAt: next,
      lastError: frequencyRaw === "off" ? null : current?.lastError ?? null,
      updatedAt: new Date(),
    };

    if (current) {
      await db
        .update(scheduledJobs)
        .set(values)
        .where(eq(scheduledJobs.id, current.id));
    } else {
      await db.insert(scheduledJobs).values({
        organizationId: session.organizationId,
        taskKey,
        ...values,
      });
    }

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "schedule.saved",
      targetType: "scheduled_job",
      targetId: taskKey,
      metadata: { frequency: frequencyRaw },
    });

    revalidatePath("/app", "layout");
    return frequencyRaw === "off"
      ? "Schedule set to manual only. The refresh button still works."
      : `Schedule saved. GroovGro will ${frequencyRaw === "daily" ? "refresh every day" : "refresh every week"}. The refresh button still works.`;
  });
}
