export const GA4_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
export const GA4_PROVIDER_KEY = "google_analytics";

export type Ga4Totals = {
  sessions: number
  activeUsers: number
};

export type Ga4MetricRow = {
  key: string
  sessions: number
};

export type Ga4PropertyChoice = {
  propertyId: string
  displayName: string
  accountName: string
};

export type Ga4SnapshotView = {
  propertyId: string
  propertyName: string
  startDate: string
  endDate: string
  totals: Ga4Totals
  topPages: Ga4MetricRow[]
  topSources: Ga4MetricRow[]
};

export function emptyGa4Totals(): Ga4Totals {
  return { sessions: 0, activeUsers: 0 };
}

export function explainGa4(snapshot: Ga4SnapshotView): {
  headline: string
  paragraphs: string[]
} {
  const pages = snapshot.topPages
    .slice(0, 3)
    .map((row) => row.key)
    .filter(Boolean)
    .join(", ");
  const sources = snapshot.topSources
    .slice(0, 3)
    .map((row) => row.key)
    .filter(Boolean)
    .join(", ");
  const paragraphs = [
    `From ${snapshot.startDate} to ${snapshot.endDate}, Analytics reported ${snapshot.totals.sessions} session${snapshot.totals.sessions === 1 ? "" : "s"} and ${snapshot.totals.activeUsers} active user${snapshot.totals.activeUsers === 1 ? "" : "s"} for ${snapshot.propertyName}.`,
  ];
  if (pages) {
    paragraphs.push(`Top landing pages: ${pages}.`);
  } else {
    paragraphs.push("Analytics has not reported landing pages in that window yet.");
  }
  if (sources) {
    paragraphs.push(`Top sources: ${sources}.`);
  }
  paragraphs.push(
    "GroovGro only reads GA4. It does not change the website, create events, or buy ads.",
  );
  return {
    headline: `${snapshot.totals.sessions} sessions in this window`,
    paragraphs,
  };
}

export function matchGa4Property(
  websiteUrl: string,
  properties: Ga4PropertyChoice[],
): { matched: Ga4PropertyChoice | null; candidates: Ga4PropertyChoice[] } {
  if (properties.length === 1) {
    return { matched: properties[0] ?? null, candidates: properties };
  }
  const host = hostnameOf(websiteUrl);
  if (!host) {
    return { matched: null, candidates: properties };
  }
  const named = properties.filter((property) => {
    const label = `${property.displayName} ${property.accountName}`.toLowerCase();
    return label.includes(host) || label.includes(stripWww(host));
  });
  if (named.length === 1) {
    return { matched: named[0] ?? null, candidates: properties };
  }
  return { matched: null, candidates: properties };
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
