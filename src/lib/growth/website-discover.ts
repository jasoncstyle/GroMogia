import { normalizeOfferKey } from "@/lib/growth/discover";

export type WebsitePageSource = "connected_website" | "groovgro_builder";

export type WebsitePageExtract = {
  url: string
  title: string
  description: string
  headings: string[]
  navLabels: string[]
  source: WebsitePageSource
  isHome: boolean
};

export type WebsiteOfferCandidate = {
  name: string
  description: string
  conversionUrl: string
  externalId: string
  confidence: number
  source: WebsitePageSource
};

export type LinkedDiscoveryUrl = {
  url: string
  score: number
  sameOrigin: boolean
};

export type WebsiteCrawlResult = {
  pages: WebsitePageExtract[]
  thirdPartyTried: number
  thirdPartyRead: number
  note: string
};

export const WEBSITE_CRAWL_LIMITS = {
  maxSameOriginPages: 20,
  maxThirdPartyPages: 2,
  maxDepth: 3,
};

const GENERIC_LABELS = new Set([
  "home",
  "homepage",
  "about",
  "about us",
  "contact",
  "contact us",
  "blog",
  "news",
  "privacy",
  "privacy policy",
  "terms",
  "terms of service",
  "login",
  "log in",
  "sign in",
  "sign up",
  "cart",
  "checkout",
  "faq",
  "faqs",
  "search",
  "menu",
  "skip to content",
  "learn more",
  "read more",
  "click here",
  "get started",
  "our story",
  "our team",
  "team",
  "careers",
  "jobs",
  "gallery",
  "photos",
  "welcome",
  "hello",
  "hi",
  "our services",
  "what we do",
  "services",
  "book now",
  "book your spot",
  "calendar",
  "calendar book now",
  "training",
  "customer portal",
  "admin",
  "admin and partner login",
  "partner login",
  "explore training",
  "view calendar",
  "view full calendar",
  "what to expect",
  "upcoming dates",
  "upcoming training dates",
  "schedule",
]);

const SKIP_PATH_EXT = /\.(pdf|jpe?g|png|gif|webp|svg|css|js|zip|mp4|mp3)(\?|$)/i;

const SKIP_PATH =
  /(^|\/)(about|about-us|contact|contact-us|faq|faqs|privacy|terms|login|signin|sign-in|signup|sign-up|customer|admin|blog|news|cart|checkout|waiver|refund)(\/|$)/i;

const SKIP_THIRD_PARTY_HOST =
  /(facebook|instagram|twitter|linkedin|tiktok|pinterest|youtube|youtu\.be|google|googleapis|gstatic|stripe|paypal|apple\.com|groovgro|gromogia)/i;

const BOOKING_HINT = /(book|calendar|event|schedul|reserv|appoint|register|enroll)/i;

const DETAIL_PATH =
  /["'](\/(?:events?|classes|workshops|sessions|programs?|courses?|dates|schedule)\/[A-Za-z0-9_-]{4,})(?:[?#][^"']*)?["']/gi;

function decode(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripTags(value: string): string {
  return decode(value.replace(/<[^>]+>/g, " "));
}

function stripNoise(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ");
}

function firstMatch(html: string, pattern: RegExp): string {
  const match = html.match(pattern);
  return match?.[1] ? stripTags(match[1]) : "";
}

function allMatches(html: string, pattern: RegExp): string[] {
  const found: string[] = [];
  for (const match of html.matchAll(pattern)) {
    const text = stripTags(match[1] ?? "");
    if (text) found.push(text);
  }
  return found;
}

export function isGenericWebsiteLabel(value: string): boolean {
  const key = normalizeOfferKey(value);
  return !key || GENERIC_LABELS.has(key);
}

export function looksLikeBrandTitle(value: string): boolean {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return /[|–—]/.test(value) || /[.?!]$/.test(value.trim()) || words.length > 6;
}

export function extractWebsitePage(
  url: string,
  html: string,
  source: WebsitePageSource = "connected_website",
): WebsitePageExtract {
  const clean = stripNoise(html);
  const title = firstMatch(clean, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description =
    firstMatch(
      clean,
      /<meta\b[^>]*name\s*=\s*["']description["'][^>]*content\s*=\s*["']([^"']*)["'][^>]*>/i,
    ) ||
    firstMatch(
      clean,
      /<meta\b[^>]*content\s*=\s*["']([^"']*)["'][^>]*name\s*=\s*["']description["'][^>]*>/i,
    );
  const headings = [
    ...allMatches(clean, /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi),
    ...allMatches(clean, /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi),
    ...allMatches(clean, /<h3\b[^>]*>([\s\S]*?)<\/h3>/gi),
  ];
  const navHtml = (clean.match(/<nav\b[\s\S]*?<\/nav>/gi) ?? []).join(" ");
  const headerHtml = (clean.match(/<header\b[\s\S]*?<\/header>/gi) ?? []).join(" ");
  const navLabels = allMatches(
    `${navHtml} ${headerHtml}`,
    /<a\b[^>]*>([\s\S]*?)<\/a>/gi,
  );
  let isHome = false;
  try {
    const parsed = new URL(url);
    isHome = parsed.pathname === "/" || parsed.pathname === "";
  } catch {
    isHome = false;
  }
  return {
    url,
    title,
    description,
    headings: headings.slice(0, 12),
    navLabels: navLabels.slice(0, 20),
    source,
    isHome,
  };
}

export function pathPriority(pathname: string): number {
  const path = pathname.toLowerCase();
  if (SKIP_PATH.test(path)) return -1;
  let score = 1;
  if (
    /(train|program|course|workshop|class|offer|service|product|session|event|calendar|book|schedul|dates|itinerary)/.test(
      path,
    )
  ) {
    score += 3;
  }
  if (path.split("/").filter(Boolean).length >= 2) score += 2;
  return score;
}

export function discoveryUrlKey(value: string): string | null {
  try {
    const parsed = new URL(value);
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${parsed.origin}${path.toLowerCase()}`;
  } catch {
    return null;
  }
}

function looksLikeBookingThirdParty(url: URL): boolean {
  if (SKIP_THIRD_PARTY_HOST.test(url.hostname)) return false;
  return BOOKING_HINT.test(`${url.hostname} ${url.pathname}`);
}

function pushLinkedUrl(
  found: LinkedDiscoveryUrl[],
  seen: Set<string>,
  href: string,
  origin: URL,
) {
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return;
  }
  let next: URL;
  try {
    next = new URL(href, origin);
  } catch {
    return;
  }
  if (next.protocol !== "http:" && next.protocol !== "https:") return;
  if (SKIP_PATH_EXT.test(next.pathname)) return;
  next.hash = "";
  const sameOrigin = next.origin === origin.origin;
  if (!sameOrigin && !looksLikeBookingThirdParty(next)) return;
  const score = sameOrigin ? pathPriority(next.pathname) : 2;
  if (sameOrigin && score < 0) return;
  const key = discoveryUrlKey(next.toString());
  if (!key || seen.has(key)) return;
  if (key === discoveryUrlKey(origin.toString())) return;
  seen.add(key);
  found.push({ url: next.toString(), score, sameOrigin });
}

export function linkedDiscoveryUrls(html: string, pageUrl: string): LinkedDiscoveryUrl[] {
  let origin: URL;
  try {
    origin = new URL(pageUrl);
  } catch {
    return [];
  }
  const found: LinkedDiscoveryUrl[] = [];
  const seen = new Set<string>();
  const clean = stripNoise(html);

  for (const match of clean.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
    pushLinkedUrl(found, seen, match[1]?.trim() ?? "", origin);
  }
  for (const match of html.matchAll(/<iframe\b[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
    pushLinkedUrl(found, seen, match[1]?.trim() ?? "", origin);
  }
  for (const match of html.matchAll(DETAIL_PATH)) {
    pushLinkedUrl(found, seen, match[1] ?? "", origin);
  }

  return found.sort((left, right) => right.score - left.score);
}

export function sameOriginPageUrls(
  html: string,
  pageUrl: string,
  limit = 6,
): string[] {
  return linkedDiscoveryUrls(html, pageUrl)
    .filter((row) => row.sameOrigin)
    .slice(0, limit)
    .map((row) => row.url);
}

function addCandidate(
  candidates: WebsiteOfferCandidate[],
  seen: Set<string>,
  name: string,
  description: string,
  conversionUrl: string,
  source: WebsitePageSource,
  confidence: number,
  homeHeading = false,
) {
  const key = normalizeOfferKey(name);
  if (!key || isGenericWebsiteLabel(name) || looksLikeBrandTitle(name)) return;
  if (key.length < 3 || name.length > 80) return;
  if (homeHeading && name.trim().split(/\s+/).filter(Boolean).length > 4) return;
  if (seen.has(key)) return;
  seen.add(key);
  candidates.push({
    name: name.trim(),
    description,
    conversionUrl,
    externalId: `web:${key}`,
    confidence,
    source,
  });
}

export function websiteOfferCandidates(
  pages: WebsitePageExtract[],
  limit = 12,
): WebsiteOfferCandidate[] {
  const candidates: WebsiteOfferCandidate[] = [];
  const seen = new Set<string>();
  const homeTitle = pages.find((page) => page.isHome)?.title ?? "";
  const rankedPages = [...pages].sort((left, right) => Number(left.isHome) - Number(right.isHome));

  for (const page of rankedPages) {
    if (
      !page.isHome &&
      page.title &&
      normalizeOfferKey(page.title) !== normalizeOfferKey(homeTitle)
    ) {
      addCandidate(
        candidates,
        seen,
        page.title.split(/[|–—]/)[0]?.trim() || page.title,
        page.description || `Suggested from the connected page ${page.url}.`,
        page.url,
        page.source,
        page.source === "groovgro_builder" ? 65 : 75,
      );
    }

    for (const heading of page.headings) {
      addCandidate(
        candidates,
        seen,
        heading,
        page.description || `Suggested from a heading on ${page.url}.`,
        page.url,
        page.source,
        page.isHome ? 55 : 70,
        page.isHome,
      );
    }
  }

  if (candidates.length === 0) {
    for (const page of pages) {
      for (const label of page.navLabels) {
        addCandidate(
          candidates,
          seen,
          label,
          `Suggested from a website menu label. Confirm only if this is something you sell or want people to do.`,
          page.url,
          page.source,
          45,
        );
      }
    }
  }

  return candidates
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, limit);
}

export function websiteBrainNotes(pages: WebsitePageExtract[]): string[] {
  const notes: string[] = [];
  if (pages.length === 0) return notes;
  const connected = pages.filter((page) => page.source === "connected_website");
  const builder = pages.filter((page) => page.source === "groovgro_builder");
  if (connected.length > 0) {
    const calendarOrEvent = connected.some((page) =>
      /calendar|event|book|schedul/i.test(page.url),
    );
    notes.push(
      calendarOrEvent
        ? `It read ${connected.length} connected website page${connected.length === 1 ? "" : "s"}, including calendar or event pages, and did not change them.`
        : `It read ${connected.length} connected website page${connected.length === 1 ? "" : "s"} and did not change them.`,
    );
    const home = connected.find((page) => page.isHome) ?? connected[0];
    if (home?.title) notes.push(`The connected homepage title is “${home.title}.”`);
    if (home?.description) notes.push(home.description);
    let homeOrigin = "";
    try {
      homeOrigin = new URL(home.url).origin;
    } catch {
      homeOrigin = "";
    }
    const thirdPartyRead = connected.filter((page) => {
      try {
        return Boolean(homeOrigin) && new URL(page.url).origin !== homeOrigin;
      } catch {
        return false;
      }
    }).length;
    if (thirdPartyRead > 0) {
      notes.push(
        `It also opened ${thirdPartyRead} public booking page${thirdPartyRead === 1 ? "" : "s"} on another site. GroovGro did not change those pages.`,
      );
    }
  }
  if (builder.length > 0) {
    notes.push(
      `It also looked at ${builder.length} GroovGro-hosted page name${builder.length === 1 ? "" : "s"} without overwriting the connected site.`,
    );
  }
  return notes;
}

export async function crawlConnectedWebsite(
  startUrl: string,
  fetchPage: (url: string) => Promise<{ ok: boolean; body: string }>,
  limits = WEBSITE_CRAWL_LIMITS,
): Promise<WebsiteCrawlResult> {
  const pages: WebsitePageExtract[] = [];
  let thirdPartyTried = 0;
  let thirdPartyRead = 0;
  let start: URL;
  try {
    start = new URL(startUrl);
  } catch {
    return {
      pages,
      thirdPartyTried,
      thirdPartyRead,
      note: "The saved website address is not a public page GroovGro can open.",
    };
  }

  const queue: { url: string; depth: number; score: number; sameOrigin: boolean }[] = [
    { url: start.toString(), depth: 0, score: 100, sameOrigin: true },
  ];
  const queued = new Set<string>();
  const startKey = discoveryUrlKey(start.toString());
  if (startKey) queued.add(startKey);

  while (queue.length > 0) {
    queue.sort((left, right) => right.score - left.score || left.depth - right.depth);
    const next = queue.shift();
    if (!next) break;

    const sameOriginCount = pages.filter((page) => {
      try {
        return new URL(page.url).origin === start.origin;
      } catch {
        return false;
      }
    }).length;
    if (next.sameOrigin && sameOriginCount >= limits.maxSameOriginPages) continue;
    if (!next.sameOrigin && thirdPartyTried >= limits.maxThirdPartyPages) continue;
    if (!next.sameOrigin) thirdPartyTried += 1;

    const fetched = await fetchPage(next.url);
    if (!fetched.ok || !fetched.body) continue;

    const extracted = extractWebsitePage(
      next.url,
      fetched.body,
      "connected_website",
    );
    pages.push({
      ...extracted,
      isHome: next.depth === 0,
    });
    if (!next.sameOrigin) thirdPartyRead += 1;
    if (next.depth >= limits.maxDepth) continue;

    for (const link of linkedDiscoveryUrls(fetched.body, next.url)) {
      const key = discoveryUrlKey(link.url);
      if (!key || queued.has(key)) continue;
      if (link.sameOrigin && !key.startsWith(start.origin)) continue;
      queued.add(key);
      queue.push({
        url: link.url,
        depth: next.depth + 1,
        score: link.score,
        sameOrigin: link.sameOrigin,
      });
    }
  }

  const calendarOrEvent = pages.some((page) => /calendar|event|book|schedul/i.test(page.url));
  const note =
    pages.length === 0
      ? "GroovGro could not download the connected homepage. The address is saved, but the pages were not read."
      : calendarOrEvent
        ? `Read ${pages.length} page${pages.length === 1 ? "" : "s"} on the connected website, including calendar or event pages. The website was not changed.`
        : `Read ${pages.length} page${pages.length === 1 ? "" : "s"} on the connected website. The website was not changed.`;

  return { pages, thirdPartyTried, thirdPartyRead, note };
}
