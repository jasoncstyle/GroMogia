import { appUrl } from "@/lib/env";
import { SEARCH_CONSOLE_SCOPE } from "@/lib/seo/search-console";
import {
  emptySearchConsoleTotals,
  sumSearchConsoleRows,
  type SearchConsoleMetricRow,
  type SearchConsoleSnapshotView,
} from "@/lib/seo/search-console";

export type GoogleOAuthConfig = {
  clientId: string
  clientSecret: string
  redirectUri: string
};

export type GoogleTokenResponse = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  error?: string
  error_description?: string
};

type SearchAnalyticsApiRow = {
  keys?: string[]
  clicks?: number
  impressions?: number
  ctr?: number
  position?: number
};

export function googleOAuthConfig(): GoogleOAuthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  if (!clientId || !clientSecret) return null;
  return {
    clientId,
    clientSecret,
    redirectUri: `${appUrl().replace(/\/$/, "")}/api/google/callback`,
  };
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(googleOAuthConfig());
}

export function googleAuthorizeUrl(state: string, config: GoogleOAuthConfig): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: SEARCH_CONSOLE_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "false",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(
  code: string,
  config: GoogleOAuthConfig,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
  });
  const tokens = await postToken(body);
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error(
      tokens.error_description ||
        "Google did not return a refresh token. Disconnect, then connect Search Console again.",
    );
  }
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in ?? 3600,
  };
}

export async function refreshGoogleAccessToken(
  refreshToken: string,
  config: GoogleOAuthConfig,
): Promise<string> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "refresh_token",
  });
  const tokens = await postToken(body);
  if (!tokens.access_token) {
    throw new Error(
      tokens.error_description ||
        "Google sign-in expired. Disconnect Search Console, then connect again.",
    );
  }
  return tokens.access_token;
}

export async function revokeGoogleToken(token: string): Promise<void> {
  await fetch("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
  });
}

export async function listSearchConsoleSites(accessToken: string): Promise<string[]> {
  const response = await googleGet(
    "https://www.googleapis.com/webmasters/v3/sites",
    accessToken,
  );
  const payload = (await response.json()) as {
    siteEntry?: Array<{ siteUrl?: string }>
    error?: { message?: string }
  };
  if (!response.ok) {
    throw new Error(payload.error?.message || "Could not list Search Console properties.");
  }
  return (payload.siteEntry ?? [])
    .map((entry) => entry.siteUrl ?? "")
    .filter(Boolean);
}

export async function fetchSearchConsoleSnapshot(
  accessToken: string,
  siteUrl: string,
  now = new Date(),
): Promise<SearchConsoleSnapshotView> {
  const { startDate, endDate } = searchConsoleWindow(now);
  const [queryRows, pageRows, totalRows] = await Promise.all([
    querySearchAnalytics(accessToken, siteUrl, {
      startDate,
      endDate,
      dimensions: ["query"],
      rowLimit: 10,
    }),
    querySearchAnalytics(accessToken, siteUrl, {
      startDate,
      endDate,
      dimensions: ["page"],
      rowLimit: 10,
    }),
    querySearchAnalytics(accessToken, siteUrl, {
      startDate,
      endDate,
      rowLimit: 1,
    }),
  ]);

  const totalsFromApi = totalRows[0];
  const totals = totalsFromApi
    ? {
        clicks: totalsFromApi.clicks ?? 0,
        impressions: totalsFromApi.impressions ?? 0,
        ctr: totalsFromApi.ctr ?? 0,
        position: totalsFromApi.position ?? 0,
      }
    : sumSearchConsoleRows(queryRows);

  return {
    propertyUrl: siteUrl,
    startDate,
    endDate,
    totals: totals.impressions || totals.clicks ? totals : emptySearchConsoleTotals(),
    topQueries: toMetricRows(queryRows),
    topPages: toMetricRows(pageRows),
  };
}

export function searchConsoleWindow(now = new Date()): {
  startDate: string
  endDate: string
} {
  const end = utcDate(now, -3);
  const start = utcDate(end, -27);
  return { startDate: isoDate(start), endDate: isoDate(end) };
}

async function querySearchAnalytics(
  accessToken: string,
  siteUrl: string,
  body: Record<string, unknown>,
): Promise<SearchAnalyticsApiRow[]> {
  const encoded = encodeURIComponent(siteUrl);
  const response = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encoded}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...body, searchType: "web" }),
    },
  );
  const payload = (await response.json()) as {
    rows?: SearchAnalyticsApiRow[]
    error?: { message?: string }
  };
  if (!response.ok) {
    throw new Error(payload.error?.message || "Could not read Search Console analytics.");
  }
  return payload.rows ?? [];
}

async function googleGet(url: string, accessToken: string): Promise<Response> {
  return fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function postToken(body: URLSearchParams): Promise<GoogleTokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return (await response.json()) as GoogleTokenResponse;
}

function toMetricRows(rows: SearchAnalyticsApiRow[]): SearchConsoleMetricRow[] {
  return rows.map((row) => ({
    key: row.keys?.[0] ?? "",
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  }));
}

function utcDate(now: Date, dayOffset: number): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset),
  );
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}
