import { appUrl } from "@/lib/env";
import {
  emptyGa4Totals,
  GA4_SCOPE,
  type Ga4MetricRow,
  type Ga4PropertyChoice,
  type Ga4SnapshotView,
} from "@/lib/ga4/analytics";
import {
  formatGoogleApiError,
  googleAuthorizeUrl,
  googleOAuthConfig,
  type GoogleOAuthConfig,
} from "@/modules/integrations/google-search-console";

type AdminAccountSummary = {
  account?: string
  displayName?: string
  propertySummaries?: Array<{
    property?: string
    displayName?: string
  }>
};

type DataApiRow = {
  dimensionValues?: Array<{ value?: string }>
  metricValues?: Array<{ value?: string }>
};

export function googleAnalyticsOAuthConfig(): GoogleOAuthConfig | null {
  const config = googleOAuthConfig();
  if (!config) return null;
  return {
    ...config,
    redirectUri: `${appUrl().replace(/\/$/, "")}/api/google-analytics/callback`,
  };
}

export function googleAnalyticsAuthorizeUrl(
  state: string,
  config: GoogleOAuthConfig,
): string {
  return googleAuthorizeUrl(state, config, GA4_SCOPE);
}

export function ga4Window(now = new Date()): { startDate: string; endDate: string } {
  const end = utcDate(now, -1);
  const start = utcDate(end, -27);
  return { startDate: isoDate(start), endDate: isoDate(end) };
}

export async function listGa4Properties(
  accessToken: string,
): Promise<Ga4PropertyChoice[]> {
  const response = await fetch(
    "https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const payload = (await readGoogleJson(response)) as {
    accountSummaries?: AdminAccountSummary[]
    error?: { message?: string; status?: string; errors?: Array<{ message?: string; reason?: string }> }
  };
  if (!response.ok) {
    throw new Error(
      formatGoogleApiError(
        payload,
        "Analytics could not list properties. Disconnect, then connect Google Analytics again. GroovGro did not change the website.",
      ),
    );
  }
  const properties: Ga4PropertyChoice[] = [];
  for (const account of payload.accountSummaries ?? []) {
    for (const property of account.propertySummaries ?? []) {
      const propertyId = propertyIdFromName(property.property ?? "");
      if (!propertyId) continue;
      properties.push({
        propertyId,
        displayName: clean(property.displayName) || `Property ${propertyId}`,
        accountName: clean(account.displayName) || "GA4",
      });
    }
  }
  return properties;
}

export async function fetchGa4Snapshot(
  accessToken: string,
  property: Ga4PropertyChoice,
  now = new Date(),
): Promise<Ga4SnapshotView> {
  const { startDate, endDate } = ga4Window(now);
  const [totals, topPages, topSources] = await Promise.all([
    runGa4Report(accessToken, property.propertyId, {
      dateRanges: [{ startDate, endDate }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      limit: "1",
    }),
    runGa4Report(accessToken, property.propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "landingPagePlusQueryString" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: "10",
    }),
    runGa4Report(accessToken, property.propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "sessionSource" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: "10",
    }),
  ]);

  const totalRow = totals[0];
  return {
    propertyId: property.propertyId,
    propertyName: property.displayName,
    startDate,
    endDate,
    totals: {
      sessions: metricNumber(totalRow, 0),
      activeUsers: metricNumber(totalRow, 1),
    },
    topPages: toMetricRows(topPages),
    topSources: toMetricRows(topSources),
  };
}

export function emptyGa4Snapshot(property?: Ga4PropertyChoice | null): Ga4SnapshotView {
  const window = ga4Window();
  return {
    propertyId: property?.propertyId ?? "",
    propertyName: property?.displayName ?? "",
    startDate: window.startDate,
    endDate: window.endDate,
    totals: emptyGa4Totals(),
    topPages: [],
    topSources: [],
  };
}

async function runGa4Report(
  accessToken: string,
  propertyId: string,
  body: Record<string, unknown>,
): Promise<DataApiRow[]> {
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  const payload = (await readGoogleJson(response)) as {
    rows?: DataApiRow[]
    error?: { message?: string; status?: string; errors?: Array<{ message?: string; reason?: string }> }
  };
  if (!response.ok) {
    throw new Error(
      formatGoogleApiError(
        payload,
        "Analytics could not read those numbers. Disconnect, then connect Google Analytics again. GroovGro did not change the website.",
      ),
    );
  }
  return payload.rows ?? [];
}

async function readGoogleJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { error: { message: text.slice(0, 180) } };
  }
}

function toMetricRows(rows: DataApiRow[]): Ga4MetricRow[] {
  return rows
    .map((row) => ({
      key: clean(row.dimensionValues?.[0]?.value),
      sessions: metricNumber(row, 0),
    }))
    .filter((row) => row.key && row.key !== "(not set)");
}

function metricNumber(row: DataApiRow | undefined, index: number): number {
  const raw = Number(row?.metricValues?.[index]?.value ?? 0);
  return Number.isFinite(raw) ? raw : 0;
}

function propertyIdFromName(name: string): string {
  const match = name.trim().match(/properties\/(\d+)/);
  return match?.[1] ?? "";
}

function clean(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function utcDate(now: Date, dayOffset: number): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset),
  );
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}
