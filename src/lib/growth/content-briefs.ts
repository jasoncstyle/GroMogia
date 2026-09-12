import { normalizeQueryKey } from "@/lib/growth/seo-actions";

/**
 * Owner-entered content briefs for the planner. GroovGro does not publish.
 */
export const CONTENT_BRIEF_SOURCE_OWNER = "owner";
export const CONTENT_BRIEF_SOURCE_COMPETITOR_GAP = "competitor_gap";
export const CONTENT_BRIEF_STATUS_PLANNED = "planned";

export type ContentBriefDraft = {
  organizationId: string
  query: string
  queryKey: string
  title: string
  audience: string
  outline: string
  status: typeof CONTENT_BRIEF_STATUS_PLANNED
  source: typeof CONTENT_BRIEF_SOURCE_OWNER | typeof CONTENT_BRIEF_SOURCE_COMPETITOR_GAP
};

export type ContentBriefView = {
  id: string
  query: string
  title: string
  audience: string
  outline: string
  createdAt: Date
};

export function suggestBriefTitle(query?: string | null): string {
  return (query ?? "").trim().replace(/\s+/g, " ");
}

export function suggestBriefOutline(query?: string | null): string {
  const title = suggestBriefTitle(query);
  if (!title) {
    return "Write what this page should cover. GroovGro will not write the page.";
  }
  return `Cover the search “${title}” on a page GroovGro has not written. GroovGro will not generate that page.`;
}

export function suggestBriefOutlineFromCompetitorGap(
  label?: string | null,
  fromNames?: string[] | null,
): string {
  const title = suggestBriefTitle(label);
  if (!title) {
    return "Write what this page should cover. Do not copy a competitor. GroovGro will not write the page.";
  }
  const who = (fromNames ?? [])
    .map((name) => name.replace(/\s+/g, " ").trim())
    .filter(Boolean)[0];
  const from = who
    ? ` A competitor site you named (${who}) shows this topic.`
    : " A competitor site you named shows this topic.";
  return `Cover “${title}” on a page GroovGro has not written.${from} Do not copy their words. GroovGro will not generate or publish that page.`;
}

export function planContentBrief(input: {
  organizationId: string
  query?: string | null
  title?: string | null
  audience?: string | null
  outline?: string | null
  source?: string | null
  fromNames?: string[] | null
}): ContentBriefDraft {
  if (!input.organizationId) {
    throw new Error("Missing organization.");
  }
  const query = suggestBriefTitle(input.query);
  const title = (input.title ?? "").trim().replace(/\s+/g, " ") || suggestBriefTitle(query);
  if (!title) {
    throw new Error("Add a working title for this brief.");
  }
  const fromGap = input.source === CONTENT_BRIEF_SOURCE_COMPETITOR_GAP;
  const outline =
    (input.outline ?? "").trim() ||
    (fromGap ? suggestBriefOutlineFromCompetitorGap(query || title, input.fromNames) : "");
  return {
    organizationId: input.organizationId,
    query,
    queryKey: query ? normalizeQueryKey(query) : "",
    title,
    audience: (input.audience ?? "").trim(),
    outline,
    status: CONTENT_BRIEF_STATUS_PLANNED,
    source: fromGap ? CONTENT_BRIEF_SOURCE_COMPETITOR_GAP : CONTENT_BRIEF_SOURCE_OWNER,
  };
}

export function describeContentBrief(
  brief: Pick<ContentBriefView, "query" | "title">,
): string {
  if (brief.query) {
    return `Planned: “${brief.title}” for “${brief.query}”.`;
  }
  return `Planned: “${brief.title}”.`;
}
