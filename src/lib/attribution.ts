export function normalizeAttributionSource(value: string | null | undefined): string {
  const trimmed = value?.trim().toLowerCase() ?? "";
  return trimmed || "unattributed";
}

export type AttributionRow = {
  source: string
  visits: number
  leads: number
  customers: number
  revenueCents: number
};

export function mergeAttributionRows(input: {
  visits: { source: string; count: number }[]
  leads: { source: string; count: number }[]
  customers: { source: string; count: number }[]
  revenue: { source: string; cents: number }[]
}): AttributionRow[] {
  const rows = new Map<string, AttributionRow>();

  function row(source: string): AttributionRow {
    const key = normalizeAttributionSource(source);
    const existing = rows.get(key);
    if (existing) return existing;
    const created = {
      source: key,
      visits: 0,
      leads: 0,
      customers: 0,
      revenueCents: 0,
    };
    rows.set(key, created);
    return created;
  }

  for (const item of input.visits) row(item.source).visits += item.count;
  for (const item of input.leads) row(item.source).leads += item.count;
  for (const item of input.customers) row(item.source).customers += item.count;
  for (const item of input.revenue) row(item.source).revenueCents += item.cents;

  return [...rows.values()].sort(
    (a, b) =>
      b.revenueCents - a.revenueCents ||
      b.leads - a.leads ||
      b.visits - a.visits ||
      a.source.localeCompare(b.source),
  );
}
