import { normalizeQueryKey } from "@/lib/growth/seo-actions";

/**
 * Owner-entered content briefs for the planner. GroovGro does not write
 * the page, generate article copy, or publish.
 */
export const CONTENT_BRIEF_SOURCE_OWNER = "owner";
export const CONTENT_BRIEF_STATUS_PLANNED = "planned";

export type ContentBriefDraft = {
  organizationId: string
  query: string
  queryKey: string
  title: string
  audience: string
  outline: string
  status: typeof CONTENT_BRIEF_STATUS_PLANNED
  source: typeof CONTENT_BRIEF_SOURCE_OWNER
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

export function planContentBrief(input: {
  organizationId: string
  query?: string | null
  title?: string | null
  audience?: string | null
  outline?: string | null
}): ContentBriefDraft {
  if (!input.organizationId) {
    throw new Error("Missing organization.");
  }
  const query = suggestBriefTitle(input.query);
  const title = (input.title ?? "").trim().replace(/\s+/g, " ") || suggestBriefTitle(query);
  if (!title) {
    throw new Error("Add a working title for this brief.");
  }
  return {
    organizationId: input.organizationId,
    query,
    queryKey: query ? normalizeQueryKey(query) : "",
    title,
    audience: (input.audience ?? "").trim(),
    outline: (input.outline ?? "").trim(),
    status: CONTENT_BRIEF_STATUS_PLANNED,
    source: CONTENT_BRIEF_SOURCE_OWNER,
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
