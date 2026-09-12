import {
  pageCoversQuery,
  pageWasRead,
  queryTokens,
  type ContentGapPage,
} from "@/lib/growth/content-gaps";
import { hasSavedContentBriefForTopic } from "@/lib/growth/content-briefs";
import { normalizeQueryKey } from "@/lib/growth/seo-actions";
import { workLearningFromResult, WORK_LEARNING_WAIT_DAYS } from "@/lib/growth/work-learning";

/**
 * One owner search-to-page loop. Pick one worth-a-look query, save a brief,
 * write a workspace draft, paste it on the existing site, then check stored
 * Search Console numbers and the Goal. GroovGro does not publish, scrape
 * Google, buy ads, or change checkout.
 */

export const SEARCH_LOOP_ACTION = "seo_search_loop";
export const SEARCH_LOOP_KIND = "search_loop";
export const SEARCH_BASELINE_PREFIX = "search=";

export const SEARCH_LOOP_STEP_WAIT = "wait";
export const SEARCH_LOOP_STEP_SAVE_BRIEF = "save_brief";
export const SEARCH_LOOP_STEP_WRITE_DRAFT = "write_draft";
export const SEARCH_LOOP_STEP_PASTE = "paste";
export const SEARCH_LOOP_STEP_CHECK = "check";
export const SEARCH_LOOP_STEP_DONE = "done";

export const SAVE_SEARCH_LOOP_BRIEF_STEP_TITLE = "Save a brief for this search";
export const WRITE_SEARCH_LOOP_DRAFT_STEP_TITLE = "Write a draft for this search";
export const PASTE_SEARCH_LOOP_STEP_TITLE = "Paste this search copy on the site";

export type SearchLoopStep =
  | typeof SEARCH_LOOP_STEP_WAIT
  | typeof SEARCH_LOOP_STEP_SAVE_BRIEF
  | typeof SEARCH_LOOP_STEP_WRITE_DRAFT
  | typeof SEARCH_LOOP_STEP_PASTE
  | typeof SEARCH_LOOP_STEP_CHECK
  | typeof SEARCH_LOOP_STEP_DONE;

export type SearchLoopKeyword = {
  query: string
  queryKey: string
  opportunityLabel: "none" | "watch" | "review"
  opportunityScore: number
  impressions: number
  clicks?: number
  position?: number
  ctr?: number
};

export type SearchLoopGap = {
  query: string
  queryKey: string
  why?: string
};

export type SearchLoopBrief = {
  id: string
  query: string
  title: string
  audience?: string | null
  outline?: string | null
  draft?: { id: string; title: string; body: string } | null
};

export type SearchLoopPaste = {
  id: string
  query: string
  result?: string | null
};

export type SearchLoopGoal = {
  id: string
  title: string
};

export type SearchLoopPageTarget = {
  url: string
  label: string
  kind: "improve" | "create"
};

export type SearchLoopView = {
  step: SearchLoopStep
  query: string
  queryKey: string
  why: string
  offerName: string
  goalId: string | null
  goalTitle: string
  page: SearchLoopPageTarget | null
  brief: SearchLoopBrief | null
  pasteActionId: string | null
  impressions: number
  clicks: number
  position: number
  ctr: number
  heading: string
  nextStepTitle: string
  nextStepBody: string
};

export type SearchQueryLearningKind =
  | "need_baseline"
  | "too_soon"
  | "improved"
  | "same"
  | "declined";

export type SearchQueryMetrics = {
  impressions: number
  clicks: number
  position: number
  ctr: number
};

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function clip(value: string, max: number): string {
  const text = clean(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function isSearchLoopStepTitle(title: string): boolean {
  const text = clean(title);
  return (
    text === SAVE_SEARCH_LOOP_BRIEF_STEP_TITLE ||
    text === WRITE_SEARCH_LOOP_DRAFT_STEP_TITLE ||
    text === PASTE_SEARCH_LOOP_STEP_TITLE
  );
}

export function matchOfferToQuery(
  query: string,
  offers?: string[] | null,
): string {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return "";
  let best = "";
  let bestScore = 0;
  for (const offer of offers ?? []) {
    const name = clean(offer);
    if (!name) continue;
    const haystack = normalizeQueryKey(name);
    const score = tokens.filter((token) => haystack.includes(token)).length;
    if (score > bestScore) {
      best = name;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : "";
}

export function pickPastePage(
  query: string,
  pages?: ContentGapPage[] | null,
): SearchLoopPageTarget | null {
  const read = (pages ?? []).filter(pageWasRead);
  if (read.length === 0) return null;
  const covered = read.find((page) => pageCoversQuery(page, query));
  if (covered) {
    return {
      url: covered.url,
      label: clean(covered.title || covered.label || covered.url),
      kind: "improve",
    };
  }
  const tokens = queryTokens(query);
  let best: ContentGapPage | null = null;
  let bestScore = 0;
  for (const page of read) {
    const text = `${page.title ?? ""} ${page.label ?? ""} ${page.url}`.toLowerCase();
    const score = tokens.filter((token) => text.includes(token)).length;
    if (score > bestScore) {
      best = page;
      bestScore = score;
    }
  }
  if (best && bestScore > 0) {
    return {
      url: best.url,
      label: clean(best.title || best.label || best.url),
      kind: "improve",
    };
  }
  const home =
    read.find((page) => {
      try {
        const parsed = new URL(
          page.url.includes("://") ? page.url : `https://${page.url}`,
        );
        return parsed.pathname === "/" || parsed.pathname === "";
      } catch {
        return false;
      }
    }) ?? read[0];
  if (!home) return null;
  return {
    url: home.url,
    label: clean(home.title || home.label || home.url) || "the connected homepage",
    kind: "create",
  };
}

export function writeSearchLoopPasteCopy(input: {
  query?: string | null
  title?: string | null
  audience?: string | null
  outline?: string | null
  offerName?: string | null
  page?: SearchLoopPageTarget | null
}): string {
  const query = clean(input.query ?? "");
  const title = clean(input.title ?? "") || query || "This search";
  const audience = clean(input.audience ?? "");
  const offer = clean(input.offerName ?? "");
  const outline = clean(input.outline ?? "");
  const page = input.page;
  const lines = [
    title,
    "",
    "Copy this onto your existing website. GroovGro has not published it or changed the live site.",
  ];
  if (query) {
    lines.push("", `Search this should serve: ${query}`);
  }
  if (audience) {
    lines.push(`Who this is for: ${audience}`);
  }
  if (offer) {
    lines.push(`Lead with “${offer}”, in this business’s words.`);
  }
  if (outline) {
    lines.push("", "What to cover:", outline);
  }
  if (page) {
    lines.push(
      "",
      page.kind === "improve"
        ? `Where to paste: the existing page ${page.url} (${page.label}). Add or rewrite the heading and the first section so it answers that search.`
        : `Where to put this: a new page on your existing site about “${query || title}”. GroovGro will not create that page. A starting place on the connected site is ${page.url}.`,
    );
  } else {
    lines.push(
      "",
      "Where to put this: a page on your existing website. GroovGro will not create or overwrite that page.",
    );
  }
  lines.push(
    "",
    "Do not invent prices, reviews, or customer names. Publishing stays off.",
  );
  return lines.join("\n");
}

function latestMetrics(keyword: SearchLoopKeyword): SearchQueryMetrics {
  return {
    impressions: Number.isFinite(keyword.impressions) ? keyword.impressions : 0,
    clicks: Number.isFinite(keyword.clicks) ? Number(keyword.clicks) : 0,
    position: Number.isFinite(keyword.position) ? Number(keyword.position) : 0,
    ctr: Number.isFinite(keyword.ctr) ? Number(keyword.ctr) : 0,
  };
}

function briefForQuery(
  briefs: SearchLoopBrief[],
  query: string,
): SearchLoopBrief | null {
  if (!hasSavedContentBriefForTopic(briefs, query)) return null;
  const key = normalizeQueryKey(query);
  return (
    briefs.find(
      (brief) =>
        normalizeQueryKey(brief.query) === key ||
        normalizeQueryKey(brief.title) === key,
    ) ?? null
  );
}

function pasteForQuery(
  pastes: SearchLoopPaste[],
  query: string,
): SearchLoopPaste | null {
  const key = normalizeQueryKey(query);
  return (
    pastes.find((paste) => normalizeQueryKey(paste.query) === key) ?? null
  );
}

function pasteIsChecked(paste: SearchLoopPaste | null): boolean {
  if (!paste) return false;
  return Boolean(workLearningFromResult(paste.result ?? ""));
}

export function pickSearchLoopTopic(input: {
  keywords?: SearchLoopKeyword[] | null
  gaps?: SearchLoopGap[] | null
  briefs?: SearchLoopBrief[] | null
  pastes?: SearchLoopPaste[] | null
}): SearchLoopKeyword | null {
  const keywords = [...(input.keywords ?? [])]
    .filter((keyword) => keyword.opportunityLabel === "review")
    .sort((left, right) => {
      if (right.opportunityScore !== left.opportunityScore) {
        return right.opportunityScore - left.opportunityScore;
      }
      return right.impressions - left.impressions;
    });
  if (keywords.length === 0) return null;

  const gapKeys = new Set(
    (input.gaps ?? []).map((gap) => normalizeQueryKey(gap.query || gap.queryKey)),
  );
  const ranked = [
    ...keywords.filter((keyword) =>
      gapKeys.has(normalizeQueryKey(keyword.query || keyword.queryKey)),
    ),
    ...keywords.filter(
      (keyword) =>
        !gapKeys.has(normalizeQueryKey(keyword.query || keyword.queryKey)),
    ),
  ];

  for (const keyword of ranked) {
    const paste = pasteForQuery(input.pastes ?? [], keyword.query);
    if (pasteIsChecked(paste)) continue;
    return keyword;
  }
  return ranked[0] ?? null;
}

export function describeSearchLoopHeading(view: Pick<SearchLoopView, "step" | "query">): string {
  if (view.step === SEARCH_LOOP_STEP_WAIT) {
    return "Search to page";
  }
  if (view.step === SEARCH_LOOP_STEP_DONE) {
    return `Search to page · “${view.query}” is listed`;
  }
  return `Search to page · next: ${view.query}`;
}

function whyForTopic(
  keyword: SearchLoopKeyword,
  gap: SearchLoopGap | undefined,
  offerName: string,
  goalTitle: string,
): string {
  const parts = [
    gap?.why?.trim() ||
      `“${keyword.query}” is a stored Search Console query marked worth a look.`,
  ];
  if (offerName) {
    parts.push(`It lines up with the offer “${offerName}”.`);
  }
  if (goalTitle) {
    parts.push(`After you paste, GroovGro can check “${goalTitle}” and this search.`);
  } else {
    parts.push("After you paste, GroovGro can check this search. Add a Goal if you want a business number next to it.");
  }
  parts.push("GroovGro will not publish, scrape Google, or change the live website.");
  return parts.join(" ");
}

function nextStepCopy(step: SearchLoopStep, query: string): {
  title: string
  body: string
} {
  if (step === SEARCH_LOOP_STEP_SAVE_BRIEF) {
    return {
      title: SAVE_SEARCH_LOOP_BRIEF_STEP_TITLE,
      body: `Save one brief for “${query}” on SEO. That starts the search-to-page loop. GroovGro will not write or publish the page.`,
    };
  }
  if (step === SEARCH_LOOP_STEP_WRITE_DRAFT) {
    return {
      title: WRITE_SEARCH_LOOP_DRAFT_STEP_TITLE,
      body: `Write a workspace draft for “${query}” on SEO. Use this business’s words. GroovGro will not publish or change the live website.`,
    };
  }
  if (step === SEARCH_LOOP_STEP_PASTE) {
    return {
      title: PASTE_SEARCH_LOOP_STEP_TITLE,
      body: `Copy the draft for “${query}” onto your existing website, then mark that you pasted it. GroovGro will not overwrite the live site.`,
    };
  }
  return { title: "", body: "" };
}

export function planSearchLoop(input: {
  keywords?: SearchLoopKeyword[] | null
  gaps?: SearchLoopGap[] | null
  briefs?: SearchLoopBrief[] | null
  pastes?: SearchLoopPaste[] | null
  pages?: ContentGapPage[] | null
  offers?: string[] | null
  goal?: SearchLoopGoal | null
}): SearchLoopView {
  const empty: SearchLoopView = {
    step: SEARCH_LOOP_STEP_WAIT,
    query: "",
    queryKey: "",
    why: "Connect Search Console and read the website first. GroovGro needs a stored worth-a-look query and pages it already read. It will not invent a topic, scrape Google, or publish.",
    offerName: "",
    goalId: null,
    goalTitle: "",
    page: null,
    brief: null,
    pasteActionId: null,
    impressions: 0,
    clicks: 0,
    position: 0,
    ctr: 0,
    heading: "Search to page",
    nextStepTitle: "",
    nextStepBody: "",
  };

  const topic = pickSearchLoopTopic(input);
  if (!topic) {
    return empty;
  }

  const brief = briefForQuery(input.briefs ?? [], topic.query);
  const paste = pasteForQuery(input.pastes ?? [], topic.query);
  const gap = (input.gaps ?? []).find(
    (row) => normalizeQueryKey(row.query) === normalizeQueryKey(topic.query),
  );
  const offerName = matchOfferToQuery(topic.query, input.offers);
  const goalTitle = clean(input.goal?.title ?? "");
  const metrics = latestMetrics(topic);
  const page = pickPastePage(topic.query, input.pages);

  let step: SearchLoopStep = SEARCH_LOOP_STEP_SAVE_BRIEF;
  if (paste && pasteIsChecked(paste)) {
    step = SEARCH_LOOP_STEP_DONE;
  } else if (paste) {
    step = SEARCH_LOOP_STEP_CHECK;
  } else if (brief?.draft) {
    step = SEARCH_LOOP_STEP_PASTE;
  } else if (brief) {
    step = SEARCH_LOOP_STEP_WRITE_DRAFT;
  }

  const copy = nextStepCopy(step, topic.query);
  const view: SearchLoopView = {
    step,
    query: topic.query,
    queryKey: topic.queryKey || normalizeQueryKey(topic.query),
    why: whyForTopic(topic, gap, offerName, goalTitle),
    offerName,
    goalId: input.goal?.id ?? null,
    goalTitle,
    page,
    brief,
    pasteActionId: paste?.id ?? null,
    impressions: metrics.impressions,
    clicks: metrics.clicks,
    position: metrics.position,
    ctr: metrics.ctr,
    heading: "",
    nextStepTitle: copy.title,
    nextStepBody: copy.body,
  };
  view.heading = describeSearchLoopHeading(view);
  return view;
}

export function searchLoopNextStep(view: SearchLoopView): {
  title: string
  body: string
  href: string
} | null {
  if (
    view.step !== SEARCH_LOOP_STEP_SAVE_BRIEF &&
    view.step !== SEARCH_LOOP_STEP_WRITE_DRAFT &&
    view.step !== SEARCH_LOOP_STEP_PASTE
  ) {
    return null;
  }
  return {
    title: view.nextStepTitle,
    body: view.nextStepBody,
    href: "/app/seo",
  };
}

export function encodeSearchBaseline(
  query: string,
  metrics: SearchQueryMetrics,
): string {
  return `${SEARCH_BASELINE_PREFIX}${metrics.impressions};clicks=${metrics.clicks};position=${metrics.position};ctr=${metrics.ctr};query=${clean(query)}`;
}

export function parseSearchBaseline(text: string): (SearchQueryMetrics & { query: string }) | null {
  const match = text.match(
    /search=(-?\d+(?:\.\d+)?);clicks=(-?\d+(?:\.\d+)?);position=(-?\d+(?:\.\d+)?);ctr=(-?\d+(?:\.\d+)?);query=([^\n]*)/,
  );
  if (!match) return null;
  const impressions = Number(match[1]);
  const clicks = Number(match[2]);
  const position = Number(match[3]);
  const ctr = Number(match[4]);
  if (
    !Number.isFinite(impressions) ||
    !Number.isFinite(clicks) ||
    !Number.isFinite(position) ||
    !Number.isFinite(ctr)
  ) {
    return null;
  }
  return {
    impressions,
    clicks,
    position,
    ctr,
    query: clean(match[5] ?? ""),
  };
}

export function learnFromSearchQuery(input: {
  query: string
  baseline: SearchQueryMetrics | null
  current: SearchQueryMetrics | null
  daysSinceDone: number
}): { kind: SearchQueryLearningKind; outcome: string } {
  const query = clean(input.query) || "this search";
  const leaveAlone =
    " This is stored Search Console, not a live scrape. Do not change the plan, buy ads, or overwrite the live website.";

  if (!input.baseline || !input.current) {
    return {
      kind: "need_baseline",
      outcome: clip(
        `GroovGro does not have two stored Search Console snapshots for “${query}” yet. Refresh Search Console later, then check again.${leaveAlone}`,
        2000,
      ),
    };
  }

  const positionDelta = input.current.position - input.baseline.position;
  const clickDelta = input.current.clicks - input.baseline.clicks;
  const moved = `Clicks went from ${input.baseline.clicks} to ${input.current.clicks}. Average position went from ${input.baseline.position} to ${input.current.position}.`;

  if (input.daysSinceDone < WORK_LEARNING_WAIT_DAYS) {
    return {
      kind: "too_soon",
      outcome: clip(
        `It has been ${Math.max(0, input.daysSinceDone)} day${input.daysSinceDone === 1 ? "" : "s"} since you pasted copy for “${query}”. ${moved} Search often needs a week or more. Wait before changing course.${leaveAlone}`,
        2000,
      ),
    };
  }

  if (clickDelta > 0 || positionDelta < -0.5) {
    return {
      kind: "improved",
      outcome: clip(
        `After you pasted copy for “${query}”, the stored Search Console numbers look better. ${moved} That is not a reason to start ads.${leaveAlone}`,
        2000,
      ),
    };
  }

  if (clickDelta < 0 || positionDelta > 0.5) {
    return {
      kind: "declined",
      outcome: clip(
        `After you pasted copy for “${query}”, the stored Search Console numbers look weaker. ${moved} Do not add spend. Keep collecting evidence.${leaveAlone}`,
        2000,
      ),
    };
  }

  return {
    kind: "same",
    outcome: clip(
      `After you pasted copy for “${query}”, the stored Search Console numbers have not moved enough to call. ${moved} Keep collecting evidence.${leaveAlone}`,
      2000,
    ),
  };
}

export function composeSearchLoopCheck(
  goalOutcome: string,
  searchOutcome: string,
): string {
  return clip(`${clean(goalOutcome)} ${clean(searchOutcome)}`, 4000);
}
