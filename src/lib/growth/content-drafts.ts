/**
 * Workspace drafts written from a saved content brief. GroovGro does not
 * publish, change the live website, or invent prices, reviews, or names.
 */
export const CONTENT_DRAFT_SOURCE_STORED_BRIEF = "stored_brief";
export const CONTENT_DRAFT_STATUS_DRAFT = "draft";

export type ContentDraftBrief = {
  organizationId: string
  briefId: string
  title: string
  query?: string | null
  audience?: string | null
  outline?: string | null
};

export type ContentDraftPlan = {
  organizationId: string
  briefId: string
  title: string
  body: string
  source: typeof CONTENT_DRAFT_SOURCE_STORED_BRIEF
  status: typeof CONTENT_DRAFT_STATUS_DRAFT
};

export type ContentDraftView = {
  briefId: string
  title: string
  body: string
  createdAt: Date
};

export function planContentDraft(input: ContentDraftBrief): ContentDraftPlan {
  if (!input.organizationId) {
    throw new Error("Missing organization.");
  }
  if (!input.briefId) {
    throw new Error("Pick a saved brief first.");
  }
  const title = (input.title ?? "").trim().replace(/\s+/g, " ");
  if (!title) {
    throw new Error("That brief needs a working title.");
  }
  return {
    organizationId: input.organizationId,
    briefId: input.briefId,
    title,
    body: writeDraftFromBrief(input),
    source: CONTENT_DRAFT_SOURCE_STORED_BRIEF,
    status: CONTENT_DRAFT_STATUS_DRAFT,
  };
}

export function writeDraftFromBrief(input: ContentDraftBrief): string {
  const title = (input.title ?? "").trim().replace(/\s+/g, " ");
  const query = (input.query ?? "").trim();
  const audience = (input.audience ?? "").trim();
  const outline = (input.outline ?? "").trim();
  const lines = [
    title,
    "",
    "This is a workspace draft written from a saved brief. GroovGro has not published it or changed the live website.",
  ];
  if (query) {
    lines.push("", `Search this should serve: ${query}`);
  }
  if (audience) {
    lines.push(`Who this is for: ${audience}`);
  }
  if (outline) {
    lines.push("", "What the brief said to cover:", outline);
  } else {
    lines.push(
      "",
      "The brief did not say what to cover yet. Add that on the planner, then write another draft.",
    );
  }
  lines.push(
    "",
    "GroovGro will not invent prices, reviews, or customer names. Publishing stays off.",
  );
  return lines.join("\n");
}
