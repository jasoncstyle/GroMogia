import { EXECUTION_EVIDENCE_OWNER } from "@/lib/execute/architecture";

/**
 * Owner-entered later-run queue. GroovGro does not run work from this
 * queue, buy ads, send email, or change the live website.
 */
export const EXECUTION_SOURCE_OWNER = EXECUTION_EVIDENCE_OWNER;
export const EXECUTION_STATUS_REVIEW = "review";
export const EXECUTION_MAX_SHOWN = 12;
export const EXECUTION_MAX_ACTIONS = 24;

const LEFT_ALONE_MODULES = new Set(["advertising", "email", "social"]);
const LEFT_ALONE_TYPES = new Set([
  "start_ads",
  "buy_ads",
  "send_email",
  "post_social",
]);

export type ExecutionAction = {
  id: string
  organizationId?: string
  title?: string
  description?: string
  module: string
  actionType: string
  status: string
  executedAt?: Date | null
};

export type ExecutionDraft = {
  organizationId: string
  actionId: string
  title: string
  note: string
  status: typeof EXECUTION_STATUS_REVIEW
  source: typeof EXECUTION_SOURCE_OWNER
};

export type ExecutionView = {
  id: string
  actionId: string
  title: string
  note: string
  createdAt: Date
};

export function executionActionTitle(action: {
  title?: string | null
  description?: string | null
}): string {
  const title = (action.title ?? "").replace(/\s+/g, " ").trim();
  if (title) return title;
  const line = (action.description ?? "")
    .split("\n")
    .map((part) => part.replace(/\s+/g, " ").trim())
    .find(Boolean);
  return line || "this approved work";
}

export function isAllowedExecutionAction(action: {
  module: string
  actionType: string
  status: string
  executedAt?: Date | null
}): boolean {
  if (action.status !== "approved") return false;
  if (action.executedAt) return false;
  if (LEFT_ALONE_MODULES.has(action.module)) return false;
  if (LEFT_ALONE_TYPES.has(action.actionType)) return false;
  return true;
}

export function actionsToQueue(actions: ExecutionAction[]): ExecutionAction[] {
  return actions.filter(isAllowedExecutionAction).slice(0, EXECUTION_MAX_ACTIONS);
}

export function planExecutionRequest(input: {
  organizationId: string
  action?: ExecutionAction | null
  note?: string | null
}): ExecutionDraft {
  if (!input.organizationId) {
    throw new Error("Missing organization.");
  }
  const action = input.action;
  if (!action?.id) {
    throw new Error("Pick approved work first.");
  }
  if (
    action.organizationId &&
    action.organizationId !== input.organizationId
  ) {
    throw new Error("That work belongs to another workspace.");
  }
  if (!isAllowedExecutionAction(action)) {
    throw new Error(
      "Only approved work GroovGro already leaves for you can be saved. GroovGro will not run ads, email, or social.",
    );
  }
  return {
    organizationId: input.organizationId,
    actionId: action.id,
    title: executionActionTitle(action),
    note: (input.note ?? "").trim(),
    status: EXECUTION_STATUS_REVIEW,
    source: EXECUTION_SOURCE_OWNER,
  };
}

export function describeExecutionRequest(
  row: Pick<ExecutionView, "title" | "note">,
): string {
  if (row.note) {
    return `Saved for later: “${row.title}”. ${row.note}`;
  }
  return `Saved for later: “${row.title}”. GroovGro has not run it.`;
}

export function executionRequestsToShow(rows: ExecutionView[]): ExecutionView[] {
  return rows.slice(0, EXECUTION_MAX_SHOWN);
}

export function actionsWaitingToQueue<T extends { id: string }>(
  actions: T[],
  requests: Array<{ actionId: string }>,
): T[] {
  const queued = new Set(requests.map((row) => row.actionId));
  return actions.filter((action) => !queued.has(action.id));
}

export function describeExecutionHeading(
  queuedCount = 0,
  waitingCount = 0,
): string {
  if (queuedCount <= 0 && waitingCount <= 0) {
    return "What is waiting to run later";
  }
  const queued = queuedCount <= 0 ? "" : ` · ${queuedCount} waiting`;
  const remaining =
    waitingCount <= 0
      ? ""
      : ` · ${waitingCount} still ${waitingCount === 1 ? "needs" : "need"} a later-run save`;
  return `What is waiting to run later${queued}${remaining}`;
}
