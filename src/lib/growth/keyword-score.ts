import { formatPosition, latestKeywordPoint, type KeywordHistoryPoint } from "@/lib/growth/keywords";

/**
 * Conservative keyword ranks from stored Search Console numbers only.
 * Tiny rows must stay "not enough evidence". This is not search volume
 * and not a traffic forecast.
 */
export const KEYWORD_SCORE_THRESHOLDS = {
  reviewMinImpressions: 100,
  watchMinImpressions: 10,
  strikingDistanceMinPosition: 8,
  strikingDistanceMaxPosition: 20,
  lowCtrMax: 0.02,
  lowCtrMinImpressions: 250,
  lowCtrMaxPosition: 8,
} as const;

export const KEYWORD_SCORE_LABELS = ["none", "watch", "review"] as const;
export type KeywordScoreLabel = (typeof KEYWORD_SCORE_LABELS)[number];

export type KeywordOpportunityScore = {
  score: number
  label: KeywordScoreLabel
  why: string
  confidence: "inferred"
};

export function keywordScoreLabelTitle(label: KeywordScoreLabel): string {
  if (label === "review") return "Worth a look";
  if (label === "watch") return "Keep watching";
  return "Not enough evidence";
}

export function scoreKeywordOpportunity(
  points: KeywordHistoryPoint[],
): KeywordOpportunityScore {
  const latest = latestKeywordPoint(points);
  if (!latest || latest.impressions <= 0) {
    return {
      score: 0,
      label: "none",
      why: "No Search Console impressions are stored yet. GroovGro will not guess search volume.",
      confidence: "inferred",
    };
  }

  const striking =
    latest.impressions >= KEYWORD_SCORE_THRESHOLDS.reviewMinImpressions &&
    latest.position >= KEYWORD_SCORE_THRESHOLDS.strikingDistanceMinPosition &&
    latest.position <= KEYWORD_SCORE_THRESHOLDS.strikingDistanceMaxPosition;
  const lowCtr =
    latest.impressions >= KEYWORD_SCORE_THRESHOLDS.lowCtrMinImpressions &&
    latest.position <= KEYWORD_SCORE_THRESHOLDS.lowCtrMaxPosition &&
    latest.ctr < KEYWORD_SCORE_THRESHOLDS.lowCtrMax;

  let score = Math.min(40, Math.round(10 * Math.log10(latest.impressions + 1)));
  if (striking) score += 30;
  else if (latest.position > 4 && latest.position < KEYWORD_SCORE_THRESHOLDS.strikingDistanceMinPosition) {
    score += 12;
  } else if (
    latest.position > KEYWORD_SCORE_THRESHOLDS.strikingDistanceMaxPosition &&
    latest.position <= 40
  ) {
    score += 8;
  }
  if (lowCtr) score += 25;
  if (points.length >= 2) {
    const first = [...points].sort((a, b) => a.endDate.localeCompare(b.endDate))[0];
    if (first && latest.impressions > first.impressions) score += 5;
  }
  score = Math.max(0, Math.min(100, score));

  let label: KeywordScoreLabel = "none";
  if (striking || lowCtr) label = "review";
  else if (latest.impressions >= KEYWORD_SCORE_THRESHOLDS.watchMinImpressions) {
    label = "watch";
  }

  return {
    score,
    label,
    why: explainKeywordScore(latest, label, { striking, lowCtr }),
    confidence: "inferred",
  };
}

export function compareKeywordScores(
  left: { label: KeywordScoreLabel; score: number; impressions: number },
  right: { label: KeywordScoreLabel; score: number; impressions: number },
): number {
  const rank = (label: KeywordScoreLabel) =>
    label === "review" ? 2 : label === "watch" ? 1 : 0;
  return (
    rank(right.label) - rank(left.label) ||
    right.score - left.score ||
    right.impressions - left.impressions
  );
}

function explainKeywordScore(
  latest: KeywordHistoryPoint,
  label: KeywordScoreLabel,
  flags: { striking: boolean; lowCtr: boolean },
): string {
  const facts = `Search Console stored ${latest.impressions} impressions at average position ${formatPosition(latest.position)}.`;
  const estimate =
    "This is an estimate from stored Search Console numbers, not search volume or a traffic forecast.";
  if (label === "review" && flags.striking) {
    return `${facts} GroovGro marked this worth a look because the query is visible but not a strong page-one result. ${estimate}`;
  }
  if (label === "review" && flags.lowCtr) {
    return `${facts} GroovGro marked this worth a look because the query is already visible and few impressions became clicks. ${estimate}`;
  }
  if (label === "watch") {
    return `${facts} GroovGro is watching this query. There is not enough evidence yet to treat it as a recommendation. ${estimate}`;
  }
  return `${facts} GroovGro needs more Search Console evidence before ranking this as an opportunity. ${estimate}`;
}
