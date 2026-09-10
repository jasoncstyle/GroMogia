import type { GrowthActionEvidence } from "@/lib/db/schema";
import {
  GROWTH_ACTION_CONFIDENCE_INFERRED,
  GROWTH_ACTION_CONFIDENCE_OBSERVED,
  GROWTH_ACTION_IMPACT_UNKNOWN,
} from "@/lib/growth/action-evidence";
import type { SearchConsoleMetricRow } from "@/lib/seo/search-console";

/**
 * Conservative evidence thresholds for recommend-only SEO growth actions.
 *
 * These are starting values, not proven SEO science. Tiny rows (for example
 * 2 impressions) must never create an action. Refine after real usage.
 *
 * - MIN_IMPRESSIONS: ignore noisy Search Console rows.
 * - STRIKING_DISTANCE_*: already visible enough to matter, not already a
 *   strong page-one result. Average position is evidence, not a rank tracker.
 * - LOW_CTR_*: only when the query is already reasonably visible. A weaker
 *   position often explains a lower CTR, so we do not treat CTR as proof
 *   that a title is bad.
 * - Caps: avoid flooding Next step / Decision History.
 */
export const SEO_ACTION_THRESHOLDS = {
  minImpressions: 100,
  strikingDistanceMinPosition: 8,
  strikingDistanceMaxPosition: 20,
  lowCtrMax: 0.02,
  lowCtrMinImpressions: 250,
  lowCtrMaxPosition: 8,
  maxPageActions: 2,
  maxSearchActions: 3,
} as const;

export const SEO_MODULE = "seo";
export const SEO_PAGE_IMPROVEMENT = "seo_page_improvement";
export const SEO_SEARCH_OPPORTUNITY = "seo_search_opportunity";
export const SEO_AUDIT_PROVIDER = "seo_audit";
export const SEARCH_CONSOLE_PROVIDER = "search_console";

const PRESENTATION_FINDING_IDS = new Set(["title", "description", "h1"]);
const UNRESOLVED_STATUSES = new Set([
  "proposed",
  "awaiting_approval",
  "approved",
]);

export type SeoFindingEvidence = {
  id: string
  severity: "ok" | "warn" | "fail"
  title: string
  detail: string
  recommendation?: string
};

export type SeoAuditEvidence = {
  url: string
  findings: SeoFindingEvidence[]
};

export type SearchConsoleEvidence = {
  startDate: string
  endDate: string
  topQueries: SearchConsoleMetricRow[]
};

export type ExistingSeoAction = {
  id?: string
  organizationId: string
  actionType: string
  module?: string
  externalId: string
  status: string
  title?: string
};

export type SeoActionDraft = {
  organizationId: string
  module: typeof SEO_MODULE
  actionType: typeof SEO_PAGE_IMPROVEMENT | typeof SEO_SEARCH_OPPORTUNITY
  title: string
  description: string
  evidence: GrowthActionEvidence
  confidence: string
  expectedImpact: string
  priority: number
  status: "proposed"
  risk: "optimization"
  provider: typeof SEO_AUDIT_PROVIDER | typeof SEARCH_CONSOLE_PROVIDER
  externalId: string
  executedAt: null
};

export type SeoActionSkipReason =
  | "below_threshold"
  | "not_meaningful"
  | "duplicate"
  | "tenant_mismatch"
  | "cap";

export type SeoActionSkip = {
  reason: SeoActionSkipReason
  actionType?: string
  kind?: string
  impressions?: number
  position?: number
};

export type SeoActionPlan = {
  toInsert: SeoActionDraft[]
  toBackfill: Array<{ id: string; draft: SeoActionDraft }>
  skipped: SeoActionSkip[]
};

export function isSeoGrowthActionType(actionType: string): boolean {
  return (
    actionType === SEO_PAGE_IMPROVEMENT || actionType === SEO_SEARCH_OPPORTUNITY
  );
}

export function isUnresolvedSeoAction(status: string): boolean {
  return UNRESOLVED_STATUSES.has(status);
}

export function normalizePageKey(url: string): string {
  try {
    const parsed = new URL(url.includes("://") ? url : `https://${url}`);
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${parsed.protocol}//${parsed.host.toLowerCase()}${path}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

export function normalizeQueryKey(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

export function seoPageExternalId(url: string): string {
  return `${SEO_PAGE_IMPROVEMENT}:${normalizePageKey(url)}`;
}

export function seoSearchExternalId(
  kind: "striking_distance" | "low_ctr",
  query: string,
): string {
  return `${SEO_SEARCH_OPPORTUNITY}:${kind}:${normalizeQueryKey(query)}`;
}

export function planSeoGrowthActions(input: {
  organizationId: string
  audits?: SeoAuditEvidence[]
  searchConsole?: SearchConsoleEvidence | null
  existingActions?: ExistingSeoAction[]
}): SeoActionPlan {
  const skipped: SeoActionSkip[] = [];
  const toInsert: SeoActionDraft[] = [];
  const toBackfill: Array<{ id: string; draft: SeoActionDraft }> = [];
  const existing = (input.existingActions ?? []).filter((action) => {
    if (action.organizationId !== input.organizationId) {
      skipped.push({ reason: "tenant_mismatch", actionType: action.actionType });
      return false;
    }
    return true;
  });

  const seen = new Set(
    existing
      .filter((action) => isUnresolvedSeoAction(action.status))
      .map((action) => action.externalId),
  );

  const unresolved = existing.filter((action) => isUnresolvedSeoAction(action.status));
  const consider = (draft: SeoActionDraft, skip: Omit<SeoActionSkip, "reason">) => {
    if (seen.has(draft.externalId)) {
      const match = unresolved.find((action) => action.externalId === draft.externalId);
      if (match?.id && !(match.title ?? "").trim()) {
        toBackfill.push({ id: match.id, draft });
        return;
      }
      skipped.push({ reason: "duplicate", ...skip });
      return;
    }
    seen.add(draft.externalId);
    toInsert.push(draft);
  };

  const audits = latestAuditsByUrl(input.audits ?? []).slice(
    0,
    SEO_ACTION_THRESHOLDS.maxPageActions,
  );
  for (const audit of audits) {
    const draft = pageImprovementFromAudit(input.organizationId, audit);
    if (!draft) {
      skipped.push({
        reason: "not_meaningful",
        actionType: SEO_PAGE_IMPROVEMENT,
        kind: "page_presentation",
      });
      continue;
    }
    consider(draft, { actionType: draft.actionType, kind: "page_presentation" });
  }

  const rankedQueries = rankSearchOpportunities(
    input.organizationId,
    input.searchConsole,
  );
  let searchAccepted = 0;
  for (const candidate of rankedQueries) {
    if (candidate.skip) {
      skipped.push(candidate.skip);
      continue;
    }
    if (!candidate.draft) continue;
    if (searchAccepted >= SEO_ACTION_THRESHOLDS.maxSearchActions) {
      skipped.push({
        reason: "cap",
        actionType: SEO_SEARCH_OPPORTUNITY,
        kind: candidate.kind,
        impressions: candidate.impressions,
        position: candidate.position,
      });
      continue;
    }
    const before = toInsert.length;
    consider(candidate.draft, {
      actionType: SEO_SEARCH_OPPORTUNITY,
      kind: candidate.kind,
      impressions: candidate.impressions,
      position: candidate.position,
    });
    if (toInsert.length > before) searchAccepted += 1;
  }

  return { toInsert, toBackfill, skipped };
}

function latestAuditsByUrl(audits: SeoAuditEvidence[]): SeoAuditEvidence[] {
  const byUrl = new Map<string, SeoAuditEvidence>();
  for (const audit of audits) {
    const key = normalizePageKey(audit.url);
    if (!byUrl.has(key)) byUrl.set(key, audit);
  }
  return [...byUrl.values()];
}

function pageImprovementFromAudit(
  organizationId: string,
  audit: SeoAuditEvidence,
): SeoActionDraft | null {
  const presentation = audit.findings.filter(
    (finding) =>
      PRESENTATION_FINDING_IDS.has(finding.id) && finding.severity !== "ok",
  );
  const fails = presentation.filter((finding) => finding.severity === "fail");
  const warns = presentation.filter((finding) => finding.severity === "warn");
  const noindex = audit.findings.find(
    (finding) => finding.id === "robots-meta" && finding.severity === "fail",
  );
  const meaningful =
    Boolean(noindex) || fails.length > 0 || warns.length >= 2;
  if (!meaningful) return null;

  const labels = [
    ...(noindex ? ["the page asks search tools not to index it"] : []),
    ...presentation.map(presentationLabel),
  ];
  const page = pageLabel(audit.url);
  const recommended = recommendFromFindings(presentation, Boolean(noindex));
  const why =
    "Search results and the page itself may not clearly say what the page offers. This is a review item, not proof that search traffic is failing.";
  const recommend = `${recommended} GroovGro will not change the live website.`;
  const evidence: GrowthActionEvidence = {
    source: SEO_AUDIT_PROVIDER,
    kind: "page_presentation",
    pageUrl: audit.url,
    findingIds: [...(noindex ? ["robots-meta"] : []), ...presentation.map((item) => item.id)],
    labels,
    why,
    recommend,
  };

  return {
    organizationId,
    module: SEO_MODULE,
    actionType: SEO_PAGE_IMPROVEMENT,
    title: `Improve search presentation on the ${page}`,
    description: [
      "GroovGro found an opportunity worth reviewing.",
      "",
      "WHAT GroovGro found",
      `The ${page} is missing or weak in important search signals: ${joinList(labels)}.`,
      "",
      "WHY this matters",
      why,
      "",
      "WHAT GroovGro recommends",
      recommend,
    ].join("\n"),
    evidence,
    confidence: GROWTH_ACTION_CONFIDENCE_OBSERVED,
    expectedImpact: GROWTH_ACTION_IMPACT_UNKNOWN,
    priority: 0,
    status: "proposed",
    risk: "optimization",
    provider: SEO_AUDIT_PROVIDER,
    externalId: seoPageExternalId(audit.url),
    executedAt: null,
  };
}

function rankSearchOpportunities(
  organizationId: string,
  snapshot?: SearchConsoleEvidence | null,
): Array<{
  draft?: SeoActionDraft
  kind: "striking_distance" | "low_ctr"
  impressions: number
  position: number
  skip?: SeoActionSkip
}> {
  if (!snapshot) return [];

  const eligible: Array<{
    draft?: SeoActionDraft
    kind: "striking_distance" | "low_ctr"
    impressions: number
    position: number
    skip?: SeoActionSkip
  }> = [];

  for (const row of snapshot.topQueries) {
    const query = row.key.trim();
    if (!query) continue;
    const impressions = Number(row.impressions) || 0;
    const position = Number(row.position) || 0;
    const ctr = Number(row.ctr) || 0;
    const clicks = Number(row.clicks) || 0;

    if (impressions < SEO_ACTION_THRESHOLDS.minImpressions) {
      eligible.push({
        kind: "striking_distance",
        impressions,
        position,
        skip: {
          reason: "below_threshold",
          actionType: SEO_SEARCH_OPPORTUNITY,
          kind: "min_impressions",
          impressions,
          position,
        },
      });
      continue;
    }

    const striking =
      position >= SEO_ACTION_THRESHOLDS.strikingDistanceMinPosition &&
      position <= SEO_ACTION_THRESHOLDS.strikingDistanceMaxPosition;
    const lowCtr =
      impressions >= SEO_ACTION_THRESHOLDS.lowCtrMinImpressions &&
      position > 0 &&
      position <= SEO_ACTION_THRESHOLDS.lowCtrMaxPosition &&
      ctr < SEO_ACTION_THRESHOLDS.lowCtrMax;

    if (!striking && !lowCtr) {
      eligible.push({
        kind: "striking_distance",
        impressions,
        position,
        skip: {
          reason: "below_threshold",
          actionType: SEO_SEARCH_OPPORTUNITY,
          kind: "not_striking_or_low_ctr",
          impressions,
          position,
        },
      });
      continue;
    }

    const kind = striking ? "striking_distance" : "low_ctr";
    eligible.push({
      draft: searchDraft({
        organizationId,
        kind,
        query,
        impressions,
        clicks,
        ctr,
        position,
        startDate: snapshot.startDate,
        endDate: snapshot.endDate,
      }),
      kind,
      impressions,
      position,
    });
  }

  return eligible.sort((a, b) => {
    if (Boolean(a.skip) !== Boolean(b.skip)) return a.skip ? 1 : -1;
    return b.impressions - a.impressions;
  });
}

function searchDraft(input: {
  organizationId: string
  kind: "striking_distance" | "low_ctr"
  query: string
  impressions: number
  clicks: number
  ctr: number
  position: number
  startDate: string
  endDate: string
}): SeoActionDraft {
  const period = `${input.startDate} to ${input.endDate}`;
  const impressionsLabel = formatCount(input.impressions);
  const positionLabel = input.position.toFixed(1);
  const ctrLabel = `${(input.ctr * 100).toFixed(1)}%`;
  const found =
    input.kind === "striking_distance"
      ? `Search Console shows that “${input.query}” received ${impressionsLabel} impressions and an average position of ${positionLabel} from ${period}.`
      : `Search Console shows that “${input.query}” received ${impressionsLabel} impressions, ${formatCount(input.clicks)} click${input.clicks === 1 ? "" : "s"} (${ctrLabel} CTR), and an average position of ${positionLabel} from ${period}.`;
  const why =
    input.kind === "striking_distance"
      ? "That search already shows the website often and may be close to stronger first-page visibility. Average position is evidence, not a guarantee."
      : "The query is already reasonably visible, but relatively few impressions became clicks. A lower CTR can have several causes, including the snippet or search intent. It does not automatically mean the title is bad.";
  const recommend =
    input.kind === "striking_distance"
      ? "Review the page Google associates with this search and strengthen how it matches that intent. GroovGro will not change the live website."
      : "Review the search title and description on the associated page so they better match what people may be looking for. GroovGro will not change the live website.";
  const title =
    input.kind === "striking_distance"
      ? `Review “${input.query}” search visibility`
      : `Review click-through for “${input.query}”`;

  return {
    organizationId: input.organizationId,
    module: SEO_MODULE,
    actionType: SEO_SEARCH_OPPORTUNITY,
    title,
    description: [
      "GroovGro found an opportunity worth reviewing.",
      "",
      "WHAT GroovGro found",
      found,
      "",
      "WHY this matters",
      why,
      "",
      "WHAT GroovGro recommends",
      recommend,
    ].join("\n"),
    evidence: {
      source: SEARCH_CONSOLE_PROVIDER,
      kind: input.kind,
      query: input.query,
      impressions: input.impressions,
      clicks: input.clicks,
      ctr: input.ctr,
      position: input.position,
      startDate: input.startDate,
      endDate: input.endDate,
      why,
      recommend,
    },
    confidence: GROWTH_ACTION_CONFIDENCE_INFERRED,
    expectedImpact: GROWTH_ACTION_IMPACT_UNKNOWN,
    priority: 0,
    status: "proposed",
    risk: "optimization",
    provider: SEARCH_CONSOLE_PROVIDER,
    externalId: seoSearchExternalId(input.kind, input.query),
    executedAt: null,
  };
}

function presentationLabel(finding: SeoFindingEvidence): string {
  if (finding.id === "title") {
    return finding.severity === "fail" ? "missing title" : "weak title";
  }
  if (finding.id === "description") {
    return finding.severity === "fail"
      ? "missing meta description"
      : "weak meta description";
  }
  if (finding.id === "h1") {
    return /no h1/i.test(finding.detail)
      ? "missing primary heading"
      : "unclear heading structure";
  }
  return finding.title.toLowerCase();
}

function recommendFromFindings(
  presentation: SeoFindingEvidence[],
  noindex: boolean,
): string {
  const parts: string[] = [];
  if (noindex) {
    parts.push("remove the noindex request if this page should appear in search");
  }
  const ids = new Set(presentation.map((finding) => finding.id));
  if (ids.has("title") || ids.has("description") || ids.has("h1")) {
    const bits = [
      ids.has("title") ? "title" : null,
      ids.has("description") ? "description" : null,
      ids.has("h1") ? "primary heading" : null,
    ].filter((item): item is string => Boolean(item));
    parts.push(`update the ${joinList(bits)} on the connected website`);
  }
  return parts.length
    ? capitalize(joinList(parts)) + "."
    : "Review the page’s search presentation on the connected website.";
}

export function pageLabel(url: string): string {
  try {
    const parsed = new URL(url.includes("://") ? url : `https://${url}`);
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length === 0) return "homepage";
    const last = decodeURIComponent(segments[segments.length - 1] ?? "")
      .replace(/[-_]+/g, " ")
      .trim();
    if (!last) return "page";
    return `${last.replace(/\b\w/g, (char) => char.toUpperCase())} page`;
  } catch {
    return "page";
  }
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function capitalize(value: string): string {
  return value ? value[0]!.toUpperCase() + value.slice(1) : value;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

