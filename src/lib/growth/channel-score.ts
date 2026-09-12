/**
 * Conservative cross-channel ranks from stored workspace counts only.
 * Empty channels stay "not enough evidence". This is not a traffic or
 * revenue forecast and must not reorder Next step.
 */
export const CHANNEL_IDS = [
  "people",
  "pages",
  "content",
  "ai_visibility",
] as const;
export type ChannelId = (typeof CHANNEL_IDS)[number];

export const CHANNEL_SCORE_LABELS = ["none", "watch", "review"] as const;
export type ChannelScoreLabel = (typeof CHANNEL_SCORE_LABELS)[number];

export const CHANNEL_SCORE_SOURCE_STORED = "stored_workspace";
export const CHANNEL_SCORE_MAX_SHOWN = 4;
export const CHANNEL_SCORE_WATCH_MAX = 2;

export type ChannelScoreFacts = {
  openLeadCount: number
  proposedSeoActionCount: number
  keywordReviewCount: number
  contentGapCount: number
  contentBriefCount: number
  contentDraftCount: number
  geoAuditGapCount: number
};

export type ChannelScore = {
  channel: ChannelId
  title: string
  label: ChannelScoreLabel
  score: number
  evidenceCount: number
  why: string
  source: typeof CHANNEL_SCORE_SOURCE_STORED
  confidence: "inferred"
};

export type ChannelScoreView = ChannelScore & {
  labelTitle: string
};

export type ChannelScoreDraft = ChannelScore & {
  organizationId: string
};

const ESTIMATE =
  "This is an estimate from stored workspace facts, not a traffic or revenue forecast.";

export function describeChannelScoreHeading(
  scoreCount = 0,
  reviewCount = 0,
): string {
  if (scoreCount <= 0 && reviewCount <= 0) {
    return "What stored evidence says to compare";
  }
  const scores = scoreCount <= 0 ? "" : ` · ${scoreCount}`;
  const review = reviewCount <= 0 ? "" : ` · ${reviewCount} worth a look`;
  return `What stored evidence says to compare${scores}${review}`;
}

export function channelScoreLabelTitle(label: ChannelScoreLabel): string {
  if (label === "review") return "Worth a look";
  if (label === "watch") return "Keep watching";
  return "Not enough evidence";
}

export function channelTitle(channel: ChannelId): string {
  if (channel === "people") return "People waiting";
  if (channel === "pages") return "Pages and search";
  if (channel === "content") return "Content to write";
  return "AI visibility";
}

export function isChannelId(value: string): value is ChannelId {
  return (CHANNEL_IDS as readonly string[]).includes(value);
}

export function isChannelScoreLabel(value: string): value is ChannelScoreLabel {
  return (CHANNEL_SCORE_LABELS as readonly string[]).includes(value);
}

export function channelScoreFactsFromCounts(
  facts: Partial<ChannelScoreFacts> & { openLeadCount?: number },
): ChannelScoreFacts {
  return {
    openLeadCount: Math.max(0, facts.openLeadCount ?? 0),
    proposedSeoActionCount: Math.max(0, facts.proposedSeoActionCount ?? 0),
    keywordReviewCount: Math.max(0, facts.keywordReviewCount ?? 0),
    contentGapCount: Math.max(0, facts.contentGapCount ?? 0),
    contentBriefCount: Math.max(0, facts.contentBriefCount ?? 0),
    contentDraftCount: Math.max(0, facts.contentDraftCount ?? 0),
    geoAuditGapCount: Math.max(0, facts.geoAuditGapCount ?? 0),
  };
}

export function scoreGrowthChannels(facts: ChannelScoreFacts): ChannelScore[] {
  const input = channelScoreFactsFromCounts(facts);
  return CHANNEL_IDS.map((channel) => scoreChannel(channel, input));
}

export function planChannelScores(input: {
  organizationId: string
  facts: ChannelScoreFacts
}): { toUpsert: ChannelScoreDraft[]; skipped: { reason: string }[] } {
  if (!input.organizationId) {
    return { toUpsert: [], skipped: [{ reason: "tenant_mismatch" }] };
  }
  return {
    toUpsert: scoreGrowthChannels(input.facts).map((row) => ({
      ...row,
      organizationId: input.organizationId,
    })),
    skipped: [],
  };
}

export function scoresToShow(rows: ChannelScore[]): ChannelScoreView[] {
  return [...rows]
    .sort(compareChannelScores)
    .slice(0, CHANNEL_SCORE_MAX_SHOWN)
    .map((row) => ({
      ...row,
      labelTitle: channelScoreLabelTitle(row.label),
    }));
}

export function channelsWithEvidence(rows: ChannelScore[]): ChannelScore[] {
  return rows.filter((row) => row.label !== "none" && row.evidenceCount > 0);
}

export function compareChannelScores(
  left: { label: ChannelScoreLabel; score: number; evidenceCount: number },
  right: { label: ChannelScoreLabel; score: number; evidenceCount: number },
): number {
  const rank = (label: ChannelScoreLabel) =>
    label === "review" ? 2 : label === "watch" ? 1 : 0;
  return (
    rank(right.label) - rank(left.label) ||
    right.score - left.score ||
    right.evidenceCount - left.evidenceCount
  );
}

function scoreChannel(channel: ChannelId, facts: ChannelScoreFacts): ChannelScore {
  const evidenceCount = evidenceCountFor(channel, facts);
  const { label, score } = bandFor(evidenceCount);
  return {
    channel,
    title: channelTitle(channel),
    label,
    score,
    evidenceCount,
    why: explainChannelScore(channel, facts, evidenceCount, label),
    source: CHANNEL_SCORE_SOURCE_STORED,
    confidence: "inferred",
  };
}

function evidenceCountFor(channel: ChannelId, facts: ChannelScoreFacts): number {
  if (channel === "people") return facts.openLeadCount;
  if (channel === "pages") {
    return facts.proposedSeoActionCount + facts.keywordReviewCount;
  }
  if (channel === "content") {
    return (
      facts.contentGapCount + facts.contentBriefCount + facts.contentDraftCount
    );
  }
  return facts.geoAuditGapCount;
}

function bandFor(count: number): { label: ChannelScoreLabel; score: number } {
  if (count <= 0) return { label: "none", score: 0 };
  if (count <= CHANNEL_SCORE_WATCH_MAX) {
    return { label: "watch", score: 20 + count * 5 };
  }
  return {
    label: "review",
    score: Math.min(80, 50 + Math.min(count - 3, 10) * 3),
  };
}

function explainChannelScore(
  channel: ChannelId,
  facts: ChannelScoreFacts,
  count: number,
  label: ChannelScoreLabel,
): string {
  const factsText = factSentence(channel, facts, count);
  if (label === "review") {
    return `${factsText} GroovGro marked this worth a look from stored workspace facts. ${ESTIMATE}`;
  }
  if (label === "watch") {
    return `${factsText} GroovGro is watching this channel. There is not enough evidence yet to treat it as the stronger kind of work. ${ESTIMATE}`;
  }
  return `${factsText} GroovGro needs more stored evidence before ranking this as an opportunity. ${ESTIMATE}`;
}

function factSentence(
  channel: ChannelId,
  facts: ChannelScoreFacts,
  count: number,
): string {
  if (channel === "people") {
    if (count <= 0) return "No open people are stored in the workspace.";
    return `The workspace has ${count} open ${count === 1 ? "person" : "people"}.`;
  }
  if (channel === "pages") {
    if (count <= 0) return "No stored page or search review items are waiting.";
    return `The workspace has ${count} stored page or search review ${count === 1 ? "item" : "items"} (${facts.proposedSeoActionCount} proposed SEO ${facts.proposedSeoActionCount === 1 ? "action" : "actions"}, ${facts.keywordReviewCount} worth-a-look ${facts.keywordReviewCount === 1 ? "query" : "queries"}).`;
  }
  if (channel === "content") {
    if (count <= 0) {
      return "No stored content gaps, briefs, or drafts are waiting.";
    }
    return `The workspace has ${count} stored content ${count === 1 ? "item" : "items"} (${facts.contentGapCount} ${facts.contentGapCount === 1 ? "query" : "queries"} with no matching page, ${facts.contentBriefCount} ${facts.contentBriefCount === 1 ? "brief" : "briefs"}, ${facts.contentDraftCount} ${facts.contentDraftCount === 1 ? "draft" : "drafts"}).`;
  }
  if (count <= 0) {
    return "No citation or mention gaps are stored from saved visibility history.";
  }
  return `The workspace has ${count} citation or mention ${count === 1 ? "gap" : "gaps"} from saved visibility history.`;
}
