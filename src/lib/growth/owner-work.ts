import { isWaitingActionStatus } from "@/lib/growth/next-step";
import { workLearningFromResult } from "@/lib/growth/work-learning";

const LEFT_ALONE_MODULES = new Set(["advertising", "email", "social"]);

const HREF_BY_TYPE: Record<string, string> = {
  follow_up_leads: "/app/crm",
  connect_website: "/app/website",
  confirm_offers: "/app/business",
  do_next_step: "/app/next-step",
  watch_progress: "/app/goals",
  next_step: "/app/next-step",
};

const HREF_BY_MODULE: Record<string, string> = {
  crm: "/app/crm",
  website: "/app/website",
  website_connect: "/app/website",
  offers: "/app/business",
  business: "/app/business",
  growth_next: "/app/next-step",
  growth_goals: "/app/goals",
  seo: "/app/seo",
  intelligence: "/app/intelligence",
};

export const OWNER_DONE_STATUS = "completed_by_owner";
export const OWNER_SKIPPED_STATUS = "skipped_by_owner";

export type OwnerWorkAction = {
  id: string
  description: string
  status: string
  risk: string
  actionType: string
  module: string
  result?: string
};

export function hrefForGrowthAction(action: {
  actionType: string
  module: string
}): string {
  if (LEFT_ALONE_MODULES.has(action.module)) return "/app/next-step";
  if (HREF_BY_TYPE[action.actionType]) return HREF_BY_TYPE[action.actionType];
  return HREF_BY_MODULE[action.module] ?? "/app/goals";
}

export function isOpenOwnerWork(status: string): boolean {
  return status === "approved";
}

export function isFinishedOwnerWork(status: string): boolean {
  return status === OWNER_DONE_STATUS || status === OWNER_SKIPPED_STATUS;
}

export function needsWhatChangedCheck(action: {
  status: string
  result?: string
}): boolean {
  return (
    action.status === OWNER_DONE_STATUS &&
    !workLearningFromResult(action.result ?? "")
  );
}

export function partitionOwnerWork<T extends OwnerWorkAction>(actions: T[]) {
  return {
    open: actions.filter((action) => isOpenOwnerWork(action.status)),
    waiting: actions.filter((action) => isWaitingActionStatus(action.status)),
    finished: actions.filter((action) => isFinishedOwnerWork(action.status)),
  };
}
