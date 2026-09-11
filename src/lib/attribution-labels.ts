import {
  normalizeAttributionCampaign,
  normalizeAttributionSource,
  type AttributionRow,
} from "@/lib/attribution";

/**
 * Conservative labels for stored people-to-revenue joins.
 * GroovGro does not invent a keyword path, AI referral, or ad click.
 */
export const ATTRIBUTION_LABELS = [
  "direct",
  "assisted",
  "estimated",
  "unknown",
] as const;
export type AttributionLabel = (typeof ATTRIBUTION_LABELS)[number];

export const GENERIC_ATTRIBUTION_SOURCES = new Set([
  "direct",
  "website",
  "stripe",
  "unattributed",
  "manual",
  "website_campaign",
  "campaign",
]);

export const ATTRIBUTION_LABEL_SOURCE_STORED = "stored_join";

export type AttributionLabelResult = {
  label: AttributionLabel
  why: string
};

export type LabeledAttributionRow = AttributionRow & AttributionLabelResult;

export type AttributionLabelCounts = {
  direct: number
  assisted: number
  estimated: number
  unknown: number
};

export function attributionLabelTitle(label: AttributionLabel): string {
  return label.toUpperCase();
}

export function attributionOriginKey(
  source: string,
  campaign = "",
): string {
  return `${normalizeAttributionSource(source)}::${normalizeAttributionCampaign(campaign)}`;
}

export function isNamedAttributionOrigin(
  source: string,
  campaign = "",
): boolean {
  const normalized = normalizeAttributionSource(source);
  if (!normalized || normalized === "unattributed") return false;
  const share = normalizeAttributionCampaign(campaign);
  if (GENERIC_ATTRIBUTION_SOURCES.has(normalized)) return Boolean(share);
  return true;
}

export function labelAttributionOrigin(input: {
  source: string
  campaign?: string
  assisted?: boolean
}): AttributionLabelResult {
  const source = normalizeAttributionSource(input.source);
  const campaign = normalizeAttributionCampaign(input.campaign);
  if (source === "unattributed") {
    return {
      label: "unknown",
      why: "GroovGro is missing the person or the source. Match charges on Bookings. GroovGro did not invent a keyword, AI referral, or ad click.",
    };
  }
  if (input.assisted && isNamedAttributionOrigin(source, campaign)) {
    return {
      label: "assisted",
      why: "This person also has another stored source. GroovGro stored those joins and did not pick a single winner. This is not a keyword or AI-referral path.",
    };
  }
  if (isNamedAttributionOrigin(source, campaign)) {
    return {
      label: "direct",
      why: "GroovGro stored this named share on the person or visit. This is a stored join, not a keyword, AI-referral, or ad-click path.",
    };
  }
  return {
    label: "estimated",
    why: "GroovGro inferred this source because a person or visit exists, not because a named share was stored. This is not a keyword or AI-referral path.",
  };
}

export function labelStoredJoin(input: {
  kind: "lead" | "charge"
  source: string
  campaign?: string
  contactId?: string | null
  namedOriginCount?: number
}): AttributionLabelResult {
  if (input.kind === "charge" && !input.contactId) {
    return {
      label: "unknown",
      why: "This Stripe charge has no person email yet. Match it on Bookings. GroovGro did not invent a keyword, AI referral, or ad click.",
    };
  }
  const namedOriginCount = Math.max(0, input.namedOriginCount ?? 0);
  return labelAttributionOrigin({
    source: input.source,
    campaign: input.campaign,
    assisted: namedOriginCount >= 2,
  });
}

export function emptyAttributionLabelCounts(): AttributionLabelCounts {
  return { direct: 0, assisted: 0, estimated: 0, unknown: 0 };
}

export function addAttributionLabelCount(
  counts: AttributionLabelCounts,
  label: AttributionLabel,
  amount = 1,
): AttributionLabelCounts {
  return { ...counts, [label]: counts[label] + amount };
}

export function countAttributionLabels(
  labels: AttributionLabel[],
): AttributionLabelCounts {
  return labels.reduce(
    (counts, label) => addAttributionLabelCount(counts, label),
    emptyAttributionLabelCounts(),
  );
}

export function namedOriginCountForContact(
  originsByContact: Map<string, Set<string>>,
  contactId: string | null | undefined,
): number {
  if (!contactId) return 0;
  return originsByContact.get(contactId)?.size ?? 0;
}

export function recordNamedOrigin(
  originsByContact: Map<string, Set<string>>,
  contactId: string | null | undefined,
  source: string,
  campaign = "",
): void {
  if (!contactId || !isNamedAttributionOrigin(source, campaign)) return;
  const existing = originsByContact.get(contactId) ?? new Set<string>();
  existing.add(attributionOriginKey(source, campaign));
  originsByContact.set(contactId, existing);
}
