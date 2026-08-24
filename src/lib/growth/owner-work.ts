import { isWaitingActionStatus } from "@/lib/growth/next-step";
import { workLearningFromResult } from "@/lib/growth/work-learning";

const LEFT_ALONE_MODULES = new Set(["advertising", "email", "social"]);

const HREF_BY_TYPE: Record<string, string> = {
  follow_up_leads: "/app/next-step",
  connect_website: "/app/next-step",
  confirm_offers: "/app/next-step",
  do_next_step: "/app/next-step",
  watch_progress: "/app/next-step",
  next_step: "/app/next-step",
  specialist_recommend: "/app/next-step",
  brand_voice_draft: "/app/next-step",
  observe_recommend: "/app/next-step",
};

const HREF_BY_MODULE: Record<string, string> = {
  crm: "/app/next-step",
  website: "/app/next-step",
  website_connect: "/app/next-step",
  offers: "/app/next-step",
  business: "/app/next-step",
  growth_next: "/app/next-step",
  growth_goals: "/app/next-step",
  seo: "/app/next-step",
  intelligence: "/app/next-step",
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
  return HREF_BY_MODULE[action.module] ?? "/app/next-step";
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
