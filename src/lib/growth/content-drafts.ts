/**
 * Workspace drafts written from a saved content brief. GroovGro does not
 * publish, change the live website, copy competitor words, or invent
 * prices, reviews, or names.
 */
import { CONTENT_BRIEF_SOURCE_COMPETITOR_GAP } from "@/lib/growth/content-briefs";

export const CONTENT_DRAFT_SOURCE_STORED_BRIEF = "stored_brief";
export const CONTENT_DRAFT_STATUS_DRAFT = "draft";
export const DRAFT_OFFER_CHECK_NAMES_AN_OFFER = "names_an_offer";
export const DRAFT_OFFER_CHECK_MISSING_OFFER = "missing_offer";
export const DRAFT_OFFER_CHECK_NO_OFFER = "no_offer_to_check";
export const DRAFT_DIFFERENCE_CHECK_NAMES = "names_a_difference";
export const DRAFT_DIFFERENCE_CHECK_MISSING = "missing_difference";
export const DRAFT_DIFFERENCE_CHECK_NO = "no_difference_to_check";

export type ContentDraftBrief = {
  organizationId: string
  briefId: string
  title: string
  query?: string | null
  audience?: string | null
  outline?: string | null
  briefSource?: string | null
  ourOffers?: string[] | null
  ourDifference?: string[] | null
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
  id: string
  briefId: string
  title: string
  body: string
  createdAt: Date
};

export type DraftOfferCheckStatus =
  | typeof DRAFT_OFFER_CHECK_NAMES_AN_OFFER
  | typeof DRAFT_OFFER_CHECK_MISSING_OFFER
  | typeof DRAFT_OFFER_CHECK_NO_OFFER;

export type DraftOfferCheckView = {
  draftId: string
  briefId: string
  title: string
  status: DraftOfferCheckStatus
  namedOffers: string[]
  note: string
};

export type DraftOfferCheckCounts = {
  checked: number
  namesAnOffer: number
  missingOffer: number
  noOfferToCheck: number
};

export type DraftDifferenceCheckStatus =
  | typeof DRAFT_DIFFERENCE_CHECK_NAMES
  | typeof DRAFT_DIFFERENCE_CHECK_MISSING
  | typeof DRAFT_DIFFERENCE_CHECK_NO;

export type DraftDifferenceCheckView = {
  draftId: string
  briefId: string
  title: string
  status: DraftDifferenceCheckStatus
  namedDifferences: string[]
  note: string
};

export type DraftDifferenceCheckCounts = {
  checked: number
  namesADifference: number
  missingDifference: number
  noDifferenceToCheck: number
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
  if (input.briefSource === CONTENT_BRIEF_SOURCE_COMPETITOR_GAP) {
    const offer = (input.ourOffers ?? [])
      .map((row) => row.replace(/\s+/g, " ").trim())
      .filter(Boolean)[0];
    const difference = (input.ourDifference ?? [])
      .map((row) => row.replace(/\s+/g, " ").trim())
      .filter(Boolean)[0];
    lines.push(
      "",
      "Write this in this business’s words. Do not copy a competitor.",
    );
    if (offer) {
      lines.push(`Lead with “${offer}”, not with their words.`);
    }
    if (difference) {
      lines.push(`What makes this business different: ${difference}.`);
    }
  }
  lines.push(
    "",
    "GroovGro will not invent prices, reviews, or customer names. Publishing stays off.",
  );
  return lines.join("\n");
}

function normalizeOfferLabel(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function uniqueOfferLabels(values?: string[] | null): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const value of values ?? []) {
    const label = normalizeOfferLabel(value);
    const key = label.toLowerCase();
    if (label.length < 2 || seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
  }
  return labels;
}

function draftNamesOffer(title: string, body: string, offer: string): boolean {
  const haystack = `${title}\n${body}`.toLowerCase();
  return haystack.includes(offer.toLowerCase());
}

export function describeDraftOfferCheck(check: DraftOfferCheckView): string {
  return check.note;
}

export function countDraftOfferChecks(
  checks: DraftOfferCheckView[],
): DraftOfferCheckCounts {
  return {
    checked: checks.length,
    namesAnOffer: checks.filter(
      (check) => check.status === DRAFT_OFFER_CHECK_NAMES_AN_OFFER,
    ).length,
    missingOffer: checks.filter(
      (check) => check.status === DRAFT_OFFER_CHECK_MISSING_OFFER,
    ).length,
    noOfferToCheck: checks.filter(
      (check) => check.status === DRAFT_OFFER_CHECK_NO_OFFER,
    ).length,
  };
}

export function planDraftOfferChecks(input: {
  drafts?: Array<{ id: string; briefId: string; title: string; body: string }> | null
  briefs?: Array<{ id: string; source?: string | null }> | null
  offers?: string[] | null
}): DraftOfferCheckView[] {
  const gapBriefs = new Set(
    (input.briefs ?? [])
      .filter((brief) => brief.source === CONTENT_BRIEF_SOURCE_COMPETITOR_GAP)
      .map((brief) => brief.id),
  );
  const offers = uniqueOfferLabels(input.offers);
  return (input.drafts ?? [])
    .filter((draft) => gapBriefs.has(draft.briefId))
    .map((draft) => {
      const title = normalizeOfferLabel(draft.title);
      if (offers.length === 0) {
        return {
          draftId: draft.id,
          briefId: draft.briefId,
          title,
          status: DRAFT_OFFER_CHECK_NO_OFFER,
          namedOffers: [] as string[],
          note: "GroovGro cannot check this draft against an offer yet. Save what you sell on Offers first. GroovGro did not publish or change the live website.",
        };
      }
      const namedOffers = offers.filter((offer) =>
        draftNamesOffer(title, draft.body ?? "", offer),
      );
      if (namedOffers.length > 0) {
        return {
          draftId: draft.id,
          briefId: draft.briefId,
          title,
          status: DRAFT_OFFER_CHECK_NAMES_AN_OFFER,
          namedOffers,
          note: `This draft names “${namedOffers[0]}”. GroovGro did not publish or change the live website.`,
        };
      }
      return {
        draftId: draft.id,
        briefId: draft.briefId,
        title,
        status: DRAFT_OFFER_CHECK_MISSING_OFFER,
        namedOffers: [] as string[],
        note: "This draft does not name a saved offer yet. Write it again after you save what you sell. GroovGro did not publish or change the live website.",
      };
    });
}

export function describeDraftDifferenceCheck(
  check: DraftDifferenceCheckView,
): string {
  return check.note;
}

export function countDraftDifferenceChecks(
  checks: DraftDifferenceCheckView[],
): DraftDifferenceCheckCounts {
  return {
    checked: checks.length,
    namesADifference: checks.filter(
      (check) => check.status === DRAFT_DIFFERENCE_CHECK_NAMES,
    ).length,
    missingDifference: checks.filter(
      (check) => check.status === DRAFT_DIFFERENCE_CHECK_MISSING,
    ).length,
    noDifferenceToCheck: checks.filter(
      (check) => check.status === DRAFT_DIFFERENCE_CHECK_NO,
    ).length,
  };
}

export function planDraftDifferenceChecks(input: {
  drafts?: Array<{ id: string; briefId: string; title: string; body: string }> | null
  briefs?: Array<{ id: string; source?: string | null }> | null
  differences?: string[] | null
}): DraftDifferenceCheckView[] {
  const gapBriefs = new Set(
    (input.briefs ?? [])
      .filter((brief) => brief.source === CONTENT_BRIEF_SOURCE_COMPETITOR_GAP)
      .map((brief) => brief.id),
  );
  const differences = uniqueOfferLabels(input.differences);
  return (input.drafts ?? [])
    .filter((draft) => gapBriefs.has(draft.briefId))
    .map((draft) => {
      const title = normalizeOfferLabel(draft.title);
      if (differences.length === 0) {
        return {
          draftId: draft.id,
          briefId: draft.briefId,
          title,
          status: DRAFT_DIFFERENCE_CHECK_NO,
          namedDifferences: [] as string[],
          note: "GroovGro cannot check this draft against what makes the business different yet. Save that on Business first. GroovGro did not publish or change the live website.",
        };
      }
      const namedDifferences = differences.filter((difference) =>
        draftNamesOffer(title, draft.body ?? "", difference),
      );
      if (namedDifferences.length > 0) {
        return {
          draftId: draft.id,
          briefId: draft.briefId,
          title,
          status: DRAFT_DIFFERENCE_CHECK_NAMES,
          namedDifferences,
          note: `This draft names “${namedDifferences[0]}”. GroovGro did not publish or change the live website.`,
        };
      }
      return {
        draftId: draft.id,
        briefId: draft.briefId,
        title,
        status: DRAFT_DIFFERENCE_CHECK_MISSING,
        namedDifferences: [] as string[],
        note: "This draft does not name what makes this business different yet. Write it again after you save that on Business. GroovGro did not publish or change the live website.",
      };
    });
}
