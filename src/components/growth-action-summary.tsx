import type { GrowthActionEvidence } from "@/lib/db/schema";
import {
  confidenceNote,
  expectedImpactNote,
  growthActionFacts,
  isEmptyEvidence,
} from "@/lib/growth/action-evidence";

export function GrowthActionSummary({
  title,
  description,
  evidence,
  confidence,
  expectedImpact,
}: {
  title?: string | null
  description: string
  evidence?: GrowthActionEvidence | null
  confidence?: string | null
  expectedImpact?: string | null
}) {
  const facts = growthActionFacts(evidence);
  const hasStructured = Boolean(title?.trim()) || !isEmptyEvidence(evidence);
  const why = evidence?.why?.trim() ?? "";
  const recommend = evidence?.recommend?.trim() ?? "";
  const observed = confidenceNote(confidence);
  const impact = expectedImpactNote(expectedImpact);

  return (
    <div className="space-y-2">
      {title?.trim() ? <p className="font-medium">{title.trim()}</p> : null}
      {facts.length > 0 ? (
        <dl className="space-y-1 text-sm">
          {facts.map((fact) => (
            <div key={fact.label} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5">
              <dt className="text-muted-foreground">{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {why ? <p className="text-sm">{why}</p> : null}
      {recommend ? <p className="text-sm">{recommend}</p> : null}
      {observed ? <p className="text-sm text-muted-foreground">{observed}</p> : null}
      {impact ? <p className="text-sm text-muted-foreground">{impact}</p> : null}
      {!hasStructured ? (
        <p className="whitespace-pre-wrap font-medium">{description}</p>
      ) : null}
    </div>
  );
}
