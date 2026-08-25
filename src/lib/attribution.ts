export function normalizeAttributionSource(value: string | null | undefined): string {
  const trimmed = value?.trim().toLowerCase() ?? "";
  return trimmed || "unattributed";
}

export function normalizeAttributionCampaign(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

export type AttributionRow = {
  source: string
  campaign: string
  visits: number
  leads: number
  customers: number
  revenueCents: number
};

export function mergeAttributionRows(input: {
  visits: { source: string; campaign?: string | null; count: number }[]
  leads: { source: string; campaign?: string | null; count: number }[]
  customers: { source: string; campaign?: string | null; count: number }[]
  revenue: { source: string; campaign?: string | null; cents: number }[]
}): AttributionRow[] {
  const rows = new Map<string, AttributionRow>();

  function row(source: string, campaign?: string | null): AttributionRow {
    const normalizedSource = normalizeAttributionSource(source);
    const normalizedCampaign = normalizeAttributionCampaign(campaign);
    const key = `${normalizedSource}::${normalizedCampaign}`;
    const existing = rows.get(key);
    if (existing) return existing;
    const created = {
      source: normalizedSource,
      campaign: normalizedCampaign,
      visits: 0,
      leads: 0,
      customers: 0,
      revenueCents: 0,
    };
    rows.set(key, created);
    return created;
  }

  for (const item of input.visits) row(item.source, item.campaign).visits += item.count;
  for (const item of input.leads) row(item.source, item.campaign).leads += item.count;
  for (const item of input.customers) row(item.source, item.campaign).customers += item.count;
  for (const item of input.revenue) row(item.source, item.campaign).revenueCents += item.cents;

  return [...rows.values()].sort(
    (a, b) =>
      b.revenueCents - a.revenueCents ||
      b.leads - a.leads ||
      b.visits - a.visits ||
      a.source.localeCompare(b.source) ||
      a.campaign.localeCompare(b.campaign),
  );
}
