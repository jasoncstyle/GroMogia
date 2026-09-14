import { and, eq, lte } from "drizzle-orm";

import { recordAudit } from "@/lib/audit";
import { refreshGa4ForOrganization } from "@/lib/actions/ga4";
import { findWebsitePagesForOrganization } from "@/lib/actions/growth";
import { refreshSearchConsoleForOrganization } from "@/lib/actions/search-console";
import { getDb } from "@/lib/db";
import { scheduledJobs } from "@/lib/db/schema";
import { isScheduledTaskKey, type ScheduledTaskKey } from "@/lib/jobs/catalog";
import {
  isScheduleFrequency,
  nextRunAfterSuccess,
  type ScheduleFrequency,
} from "@/lib/jobs/schedule";
import { syncStripeForOrganization } from "@/modules/integrations/stripe";

const MAX_JOBS_PER_TICK = 8;

type JobResult = {
  taskKey: string
  organizationId: string
  status: "ok" | "error" | "skipped"
  message: string
};

export async function runDueScheduledJobs(now = new Date()): Promise<JobResult[]> {
  const db = getDb();
  if (!db) throw new Error("Database is not configured");

  const due = await db
    .select()
    .from(scheduledJobs)
    .where(lte(scheduledJobs.nextRunAt, now))
    .limit(MAX_JOBS_PER_TICK);

  const results: JobResult[] = [];
  for (const row of due) {
    if (!isScheduleFrequency(row.frequency) || row.frequency === "off") continue;
    if (!isScheduledTaskKey(row.taskKey)) continue;
    results.push(
      await runScheduledJob({
        organizationId: row.organizationId,
        taskKey: row.taskKey,
        frequency: row.frequency,
        now,
      }),
    );
  }
  return results;
}

export async function runScheduledJob(input: {
  organizationId: string
  taskKey: ScheduledTaskKey
  frequency: ScheduleFrequency
  now?: Date
}): Promise<JobResult> {
  const now = input.now ?? new Date();
  try {
    const message = await executeTask(input.taskKey, input.organizationId);
    await markJob(input.organizationId, input.taskKey, {
      lastRunAt: now,
      nextRunAt: nextRunAfterSuccess(input.frequency, now),
      lastStatus: "ok",
      lastError: null,
    });
    await recordAudit({
      organizationId: input.organizationId,
      action: "schedule.ran",
      targetType: "scheduled_job",
      targetId: input.taskKey,
      metadata: { status: "ok", message },
    });
    return {
      taskKey: input.taskKey,
      organizationId: input.organizationId,
      status: "ok",
      message,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message.slice(0, 400)
        : "That scheduled refresh failed.";
    await markJob(input.organizationId, input.taskKey, {
      lastRunAt: now,
      nextRunAt: nextRunAfterSuccess(input.frequency, now),
      lastStatus: "error",
      lastError: message,
    });
    await recordAudit({
      organizationId: input.organizationId,
      action: "schedule.failed",
      targetType: "scheduled_job",
      targetId: input.taskKey,
      metadata: { status: "error", message },
    });
    return {
      taskKey: input.taskKey,
      organizationId: input.organizationId,
      status: "error",
      message,
    };
  }
}

async function executeTask(
  taskKey: ScheduledTaskKey,
  organizationId: string,
): Promise<string> {
  if (taskKey === "search_console.refresh") {
    const snapshot = await refreshSearchConsoleForOrganization({ organizationId });
    return snapshot
      ? "Search Console numbers saved. GroovGro did not change the website."
      : "Pick the Search Console property, then refresh.";
  }
  if (taskKey === "ga4.refresh") {
    const snapshot = await refreshGa4ForOrganization({ organizationId });
    return snapshot
      ? "Analytics numbers saved. GroovGro did not change the website."
      : "Pick the GA4 property, then refresh.";
  }
  if (taskKey === "website.read") {
    return findWebsitePagesForOrganization({ organizationId });
  }
  const imported = await syncStripeForOrganization(organizationId);
  return imported
    ? `Imported ${imported} Stripe record${imported === 1 ? "" : "s"}`
    : "Stripe is up to date";
}

async function markJob(
  organizationId: string,
  taskKey: string,
  values: {
    lastRunAt: Date
    nextRunAt: Date | null
    lastStatus: string
    lastError: string | null
  },
) {
  const db = getDb();
  if (!db) return;
  await db
    .update(scheduledJobs)
    .set({
      ...values,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(scheduledJobs.organizationId, organizationId),
        eq(scheduledJobs.taskKey, taskKey),
      ),
    );
}
