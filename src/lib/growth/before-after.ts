/**
 * Conservative before-and-after looks from stored Goal numbers only.
 * Two snapshots are required. This is not an experiment GroovGro ran
 * and not a reason to buy ads or change the plan.
 */
export const BEFORE_AFTER_SOURCE_STORED_GOAL = "stored_goal";
export const BEFORE_AFTER_MAX_SHOWN = 8;
export const BEFORE_AFTER_STATUSES = [
  "improved",
  "same",
  "declined",
] as const;
export type BeforeAfterStatus = (typeof BEFORE_AFTER_STATUSES)[number];

export type BeforeAfterGoal = {
  id: string
  organizationId: string
  title: string
  unit: string
};

export type BeforeAfterSnapshot = {
  id: string
  organizationId: string
  goalId: string
  value: number
  recordedOn: string
  recordedAt: Date
};

export type BeforeAfterLook = {
  organizationId: string
  goalId: string
  title: string
  beforeValue: number
  afterValue: number
  unit: string
  beforeOn: string
  afterOn: string
  beforeSnapshotId: string
  afterSnapshotId: string
  status: BeforeAfterStatus
  why: string
  source: typeof BEFORE_AFTER_SOURCE_STORED_GOAL
};

export type BeforeAfterView = BeforeAfterLook & {
  statusTitle: string
};

const LEAVE_ALONE =
  "This is a stored before and after, not an experiment GroovGro ran, and not a reason to buy ads or change the plan.";

export function describeBeforeAfterHeading(lookCount = 0): string {
  if (lookCount <= 0) {
    return "What a stored before and after shows";
  }
  return `What a stored before and after shows · ${lookCount}`;
}

export function beforeAfterStatusTitle(status: BeforeAfterStatus): string {
  if (status === "improved") return "Moved up";
  if (status === "declined") return "Moved down";
  return "No move yet";
}

export function isBeforeAfterStatus(value: string): value is BeforeAfterStatus {
  return (BEFORE_AFTER_STATUSES as readonly string[]).includes(value);
}

export function describeBeforeAfter(look: {
  title: string
  beforeValue: number
  afterValue: number
  unit: string
}): string {
  const unit = look.unit.replace(/\s+/g, " ").trim();
  const before = unit ? `${look.beforeValue} ${unit}` : String(look.beforeValue);
  const after = unit ? `${look.afterValue} ${unit}` : String(look.afterValue);
  return `“${look.title.replace(/\s+/g, " ").trim()}” moved from ${before} to ${after}.`;
}

export function earliestAndLatestSnapshots(
  snapshots: BeforeAfterSnapshot[],
  goalId: string,
): { before: BeforeAfterSnapshot; after: BeforeAfterSnapshot } | null {
  const rows = snapshots
    .filter((row) => row.goalId === goalId)
    .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
  const before = rows[0];
  const after = rows[rows.length - 1];
  if (!before || !after || before.id === after.id) return null;
  return { before, after };
}

export function planBeforeAfterLooks(input: {
  organizationId: string
  goals: BeforeAfterGoal[]
  snapshots: BeforeAfterSnapshot[]
}): {
  toUpsert: BeforeAfterLook[]
  skipped: { goalId?: string; reason: string }[]
} {
  if (!input.organizationId) {
    return { toUpsert: [], skipped: [{ reason: "tenant_mismatch" }] };
  }

  const toUpsert: BeforeAfterLook[] = [];
  const skipped: { goalId?: string; reason: string }[] = [];

  for (const goal of input.goals) {
    if (goal.organizationId !== input.organizationId) {
      skipped.push({ goalId: goal.id, reason: "tenant_mismatch" });
      continue;
    }
    const pair = earliestAndLatestSnapshots(
      input.snapshots.filter((row) => row.organizationId === input.organizationId),
      goal.id,
    );
    if (!pair) {
      skipped.push({ goalId: goal.id, reason: "snapshots_missing" });
      continue;
    }
    const delta = pair.after.value - pair.before.value;
    const status: BeforeAfterStatus =
      delta > 0 ? "improved" : delta < 0 ? "declined" : "same";
    const unit = goal.unit.replace(/\s+/g, " ").trim();
    toUpsert.push({
      organizationId: input.organizationId,
      goalId: goal.id,
      title: goal.title.replace(/\s+/g, " ").trim() || "this Goal",
      beforeValue: pair.before.value,
      afterValue: pair.after.value,
      unit,
      beforeOn: pair.before.recordedOn,
      afterOn: pair.after.recordedOn,
      beforeSnapshotId: pair.before.id,
      afterSnapshotId: pair.after.id,
      status,
      why: `${describeBeforeAfter({
        title: goal.title.replace(/\s+/g, " ").trim() || "this Goal",
        beforeValue: pair.before.value,
        afterValue: pair.after.value,
        unit,
      })} ${LEAVE_ALONE}`,
      source: BEFORE_AFTER_SOURCE_STORED_GOAL,
    });
  }

  return { toUpsert, skipped };
}

export function looksToShow(rows: BeforeAfterLook[]): BeforeAfterView[] {
  const rank = (status: BeforeAfterStatus) =>
    status === "declined" ? 2 : status === "improved" ? 1 : 0;
  return [...rows]
    .sort(
      (left, right) =>
        rank(right.status) - rank(left.status) ||
        right.afterOn.localeCompare(left.afterOn) ||
        left.title.localeCompare(right.title),
    )
    .slice(0, BEFORE_AFTER_MAX_SHOWN)
    .map((row) => ({
      ...row,
      statusTitle: beforeAfterStatusTitle(row.status),
    }));
}
