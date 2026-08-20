import type { SeoFinding } from "@/lib/seo/audit";

const SEVERITY_RANK: Record<SeoFinding["severity"], number> = {
  ok: 0,
  warn: 1,
  fail: 2,
};

export type SeoCheckSnapshot = {
  score: number
  findings: SeoFinding[]
};

export type SeoFindingChange = {
  id: string
  title: string
  from: SeoFinding["severity"]
  to: SeoFinding["severity"]
};

export type SeoCheckComparison = {
  currentScore: number
  previousScore: number | null
  scoreChange: number | null
  improved: SeoFindingChange[]
  worsened: SeoFindingChange[]
  stillNeedsWork: Array<{
    id: string
    title: string
    severity: SeoFinding["severity"]
  }>
};

export function compareSeoChecks(
  current: SeoCheckSnapshot,
  previous: SeoCheckSnapshot | null,
): SeoCheckComparison {
  const stillNeedsWork = current.findings
    .filter((finding) => finding.severity !== "ok")
    .map((finding) => ({
      id: finding.id,
      title: finding.title,
      severity: finding.severity,
    }));

  if (!previous) {
    return {
      currentScore: current.score,
      previousScore: null,
      scoreChange: null,
      improved: [],
      worsened: [],
      stillNeedsWork,
    };
  }

  const previousById = new Map(
    previous.findings.map((finding) => [finding.id, finding]),
  );
  const improved: SeoFindingChange[] = [];
  const worsened: SeoFindingChange[] = [];

  for (const finding of current.findings) {
    const before = previousById.get(finding.id);
    if (!before) continue;
    const fromRank = SEVERITY_RANK[before.severity];
    const toRank = SEVERITY_RANK[finding.severity];
    if (toRank < fromRank) {
      improved.push({
        id: finding.id,
        title: finding.title,
        from: before.severity,
        to: finding.severity,
      });
    } else if (toRank > fromRank) {
      worsened.push({
        id: finding.id,
        title: finding.title,
        from: before.severity,
        to: finding.severity,
      });
    }
  }

  return {
    currentScore: current.score,
    previousScore: previous.score,
    scoreChange: current.score - previous.score,
    improved,
    worsened,
    stillNeedsWork,
  };
}

export function scoreTrendLabel(change: number | null): string {
  if (change === null) return "This is the first saved check.";
  if (change > 0) return `Score is up ${change} from the previous check.`;
  if (change < 0) {
    return `Score is down ${Math.abs(change)} from the previous check.`;
  }
  return "Score is the same as the previous check.";
}
