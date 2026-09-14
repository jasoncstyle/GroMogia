import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { scheduledJobs } from "@/lib/db/schema";
import { SCHEDULED_TASKS } from "@/lib/jobs/catalog";
import {
  describeFrequency,
  isScheduleFrequency,
  type ScheduleFrequency,
} from "@/lib/jobs/schedule";

export type TaskScheduleView = {
  taskKey: string
  name: string
  section: string
  href: string
  description: string
  frequency: ScheduleFrequency
  lastRunAt: Date | null
  nextRunAt: Date | null
  lastStatus: string | null
  lastError: string | null
  frequencyLabel: string
};

export async function getTaskSchedule(
  organizationId: string,
  taskKey: string,
): Promise<TaskScheduleView | null> {
  const task = SCHEDULED_TASKS.find((row) => row.key === taskKey);
  if (!task) return null;
  const db = getDb();
  const [row] = db
    ? await db
        .select()
        .from(scheduledJobs)
        .where(
          and(
            eq(scheduledJobs.organizationId, organizationId),
            eq(scheduledJobs.taskKey, taskKey),
          ),
        )
        .limit(1)
    : [];
  const frequency = isScheduleFrequency(row?.frequency) ? row.frequency : "off";
  return {
    taskKey: task.key,
    name: task.name,
    section: task.section,
    href: task.href,
    description: task.description,
    frequency,
    lastRunAt: row?.lastRunAt ?? null,
    nextRunAt: row?.nextRunAt ?? null,
    lastStatus: row?.lastStatus ?? null,
    lastError: row?.lastError ?? null,
    frequencyLabel: describeFrequency(frequency),
  };
}

export async function listTaskSchedules(
  organizationId: string,
): Promise<TaskScheduleView[]> {
  const views = await Promise.all(
    SCHEDULED_TASKS.map((task) => getTaskSchedule(organizationId, task.key)),
  );
  return views.filter((row): row is TaskScheduleView => Boolean(row));
}
