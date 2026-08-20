export const SEARCH_CONSOLE_SCOPE =
  "https://www.googleapis.com/auth/webmasters.readonly";

export type SearchConsoleMetricRow = {
  key: string
  clicks: number
  impressions: number
  ctr: number
  position: number
};

export type SearchConsoleTotals = {
  clicks: number
  impressions: number
  ctr: number
  position: number
};

export type SearchConsoleSnapshotView = {
  propertyUrl: string
  startDate: string
  endDate: string
  totals: SearchConsoleTotals
  topQueries: SearchConsoleMetricRow[]
  topPages: SearchConsoleMetricRow[]
};

export function matchSearchConsoleProperty(
  websiteUrl: string,
  properties: string[],
): { matched: string | null; candidates: string[] } {
  const candidates = properties.filter((property) =>
    propertyCoversWebsite(property, websiteUrl),
  );
  if (candidates.length === 1) {
    return { matched: candidates[0] ?? null, candidates };
  }
  const preferred =
    candidates.find((item) => item.startsWith("sc-domain:")) ??
    candidates.find((item) => item.startsWith("https://www.")) ??
    candidates[0] ??
    null;
  return {
    matched: candidates.length === 1 ? preferred : null,
    candidates,
  };
}

export function propertyCoversWebsite(property: string, websiteUrl: string): boolean {
  const host = hostnameOf(websiteUrl);
  if (!host) return false;
  if (property.startsWith("sc-domain:")) {
    const domain = property.slice("sc-domain:".length).toLowerCase();
    return host === domain || host.endsWith(`.${domain}`);
  }
  try {
    const propertyUrl = new URL(property);
    const siteUrl = new URL(websiteUrl.includes("://") ? websiteUrl : `https://${websiteUrl}`);
    if (propertyUrl.origin === siteUrl.origin) return true;
    return (
      stripWww(propertyUrl.hostname) === stripWww(siteUrl.hostname) &&
      propertyUrl.protocol === siteUrl.protocol
    );
  } catch {
    return false;
  }
}

export function explainSearchConsole(snapshot: SearchConsoleSnapshotView): {
  headline: string
  paragraphs: string[]
} {
  const queries = snapshot.topQueries
    .slice(0, 3)
    .map((row) => `“${row.key}”`)
    .join(", ");
  const paragraphs = [
    `From ${snapshot.startDate} to ${snapshot.endDate}, Google Search reported ${snapshot.totals.clicks} click${snapshot.totals.clicks === 1 ? "" : "s"} and ${snapshot.totals.impressions} impression${snapshot.totals.impressions === 1 ? "" : "s"} for ${snapshot.propertyUrl}.`,
  ];
  if (snapshot.totals.impressions > 0) {
    paragraphs.push(
      `Average position is ${snapshot.totals.position.toFixed(1)}. About ${(snapshot.totals.ctr * 100).toFixed(1)}% of impressions became clicks.`,
    );
  }
  if (queries) {
    paragraphs.push(`Top search queries: ${queries}.`);
  } else {
    paragraphs.push(
      "Google has not reported search queries for this property in that window yet. New sites can take a few days.",
    );
  }
  paragraphs.push(
    "GroovGro only reads Search Console. It does not change the website, submit sitemaps, or buy ads.",
  );
  return {
    headline: `${snapshot.totals.clicks} search clicks in this window`,
    paragraphs,
  };
}

export function emptySearchConsoleTotals(): SearchConsoleTotals {
  return { clicks: 0, impressions: 0, ctr: 0, position: 0 };
}

export function sumSearchConsoleRows(
  rows: Array<{ clicks?: number; impressions?: number; ctr?: number; position?: number }>,
): SearchConsoleTotals {
  if (rows.length === 0) return emptySearchConsoleTotals();
  const clicks = rows.reduce((sum, row) => sum + (row.clicks ?? 0), 0);
  const impressions = rows.reduce((sum, row) => sum + (row.impressions ?? 0), 0);
  const positionWeight = rows.reduce(
    (sum, row) => sum + (row.position ?? 0) * (row.impressions ?? 0),
    0,
  );
  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : 0,
    position: impressions > 0 ? positionWeight / impressions : 0,
  };
}

function hostnameOf(value: string): string | null {
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return stripWww(url.hostname);
  } catch {
    return null;
  }
}

function stripWww(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}
