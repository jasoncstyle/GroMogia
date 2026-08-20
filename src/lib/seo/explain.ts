import type { SeoFinding } from "@/lib/seo/audit";
import {
  scoreTrendLabel,
  type SeoCheckComparison,
} from "@/lib/seo/monitor";

export type SeoExplanation = {
  headline: string
  paragraphs: string[]
};

export function explainSeoCheck(input: {
  score: number
  findings: SeoFinding[]
  comparison: SeoCheckComparison
}): SeoExplanation {
  const fails = input.findings.filter((item) => item.severity === "fail");
  const warns = input.findings.filter((item) => item.severity === "warn");
  const firstActions = [...fails, ...warns].slice(0, 3);
  const paragraphs: string[] = [];

  if (fails.length > 0) {
    paragraphs.push(
      `Fix ${listTitles(fails)} first. Those are blocking search tools from treating the page as ready.`,
    );
  } else if (warns.length > 0) {
    paragraphs.push(
      `Nothing is blocking the page. Make these clearer when you can: ${listTitles(warns)}.`,
    );
  } else {
    paragraphs.push(
      "This homepage looks complete for a first technical check. Keep the title and description specific when you change the page.",
    );
  }

  if (firstActions.length > 0) {
    paragraphs.push(
      `Do this first: ${firstActions.map((item) => item.recommendation.replace(/\s+/g, " ").trim()).join(" ")}`,
    );
  }

  paragraphs.push(scoreTrendLabel(input.comparison.scoreChange));

  if (input.comparison.improved.length > 0) {
    paragraphs.push(
      `Better since last time: ${listTitles(input.comparison.improved)}.`,
    );
  }
  if (input.comparison.worsened.length > 0) {
    paragraphs.push(
      `Worse since last time: ${listTitles(input.comparison.worsened)}.`,
    );
  }

  paragraphs.push(
    "GroovGro did not change the website. Approve drafts here, then copy them onto the connected site yourself unless you use the GroovGro builder, WordPress, or a similar official connection.",
  );

  return {
    headline: `Score ${input.score} out of 100`,
    paragraphs,
  };
}

function listTitles(items: Array<{ title: string }>): string {
  const titles = items.map((item) => item.title);
  if (titles.length === 1) return titles[0] ?? "";
  if (titles.length === 2) return `${titles[0]} and ${titles[1]}`;
  return `${titles.slice(0, -1).join(", ")}, and ${titles.at(-1)}`;
}
