import { CMS_EVIDENCE_OWNER } from "@/lib/cms/architecture";

/**
 * Owner-entered CMS publish review queue. GroovGro does not publish
 * from this queue or change the live website.
 */
export const CMS_PUBLISH_SOURCE_OWNER = CMS_EVIDENCE_OWNER;
export const CMS_PUBLISH_STATUS_REVIEW = "review";
export const CMS_PUBLISH_MAX_SHOWN = 12;

export type CmsPublishDraft = {
  organizationId: string
  draftId: string
  title: string
  note: string
  status: typeof CMS_PUBLISH_STATUS_REVIEW
  source: typeof CMS_PUBLISH_SOURCE_OWNER
};

export type CmsPublishView = {
  id: string
  draftId: string
  title: string
  note: string
  createdAt: Date
};

export function planCmsPublishRequest(input: {
  organizationId: string
  draftId?: string | null
  title?: string | null
  note?: string | null
}): CmsPublishDraft {
  if (!input.organizationId) {
    throw new Error("Missing organization.");
  }
  const draftId = (input.draftId ?? "").trim();
  const title = (input.title ?? "").trim().replace(/\s+/g, " ");
  if (!draftId || !title) {
    throw new Error("Pick a workspace draft first.");
  }
  return {
    organizationId: input.organizationId,
    draftId,
    title,
    note: (input.note ?? "").trim(),
    status: CMS_PUBLISH_STATUS_REVIEW,
    source: CMS_PUBLISH_SOURCE_OWNER,
  };
}

export function describeCmsPublishRequest(
  row: Pick<CmsPublishView, "title" | "note">,
): string {
  if (row.note) {
    return `Review later: “${row.title}”. ${row.note}`;
  }
  return `Review later: “${row.title}”. GroovGro has not published it.`;
}

export function publishRequestsToShow(rows: CmsPublishView[]): CmsPublishView[] {
  return rows.slice(0, CMS_PUBLISH_MAX_SHOWN);
}

export function describePlannerHeading(
  queuedCount: number,
  briefCount = 0,
  needingDraftCount = 0,
): string {
  if (briefCount <= 0 && queuedCount <= 0) {
    return "Content planner";
  }
  if (briefCount <= 0) {
    return `Content planner · ${queuedCount} saved for later review`;
  }
  const briefs = `${briefCount} ${briefCount === 1 ? "brief" : "briefs"}`;
  const remaining =
    needingDraftCount <= 0
      ? ""
      : needingDraftCount >= briefCount
        ? " · all still need a draft"
        : ` · ${needingDraftCount} still ${needingDraftCount === 1 ? "needs" : "need"} a draft`;
  if (queuedCount <= 0) {
    return `Content planner · ${briefs}${remaining}`;
  }
  return `Content planner · ${briefs}${remaining} · ${queuedCount} saved for later review`;
}

export function describePublishQueueHeading(
  queuedCount: number,
  waitingCount = 0,
): string {
  if (queuedCount <= 0 && waitingCount <= 0) {
    return "Drafts ready to publish later";
  }
  if (queuedCount <= 0) {
    return `Drafts ready to publish later · ${waitingCount} still ${waitingCount === 1 ? "needs" : "need"} later review`;
  }
  if (waitingCount <= 0) {
    return `Drafts ready to publish later · ${queuedCount} waiting`;
  }
  return `Drafts ready to publish later · ${queuedCount} waiting · ${waitingCount} still ${waitingCount === 1 ? "needs" : "need"} later review`;
}

export function describePublishQueueCopy(waitingCount = 0): string {
  const remaining =
    waitingCount <= 0
      ? ""
      : " Drafts that still need later review are listed first.";
  return `Save a workspace draft for later review.${remaining} GroovGro will not publish, write a CMS, or change the live website. The adapter stays off.`;
}

export function draftsWaitingToQueue<T extends { id: string }>(
  drafts: T[],
  requests: Array<{ draftId: string }>,
): T[] {
  const queued = new Set(requests.map((row) => row.draftId));
  return drafts.filter((draft) => !queued.has(draft.id));
}
