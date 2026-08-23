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
]);

const SKIP_PATH_EXT = /\.(pdf|jpe?g|png|gif|webp|svg|css|js|zip|mp4|mp3)(\?|$)/i;

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
  return /[|–—]/.test(value) || value.split(/\s+/).length > 8;
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

export function sameOriginPageUrls(
  html: string,
  pageUrl: string,
  limit = 4,
): string[] {
  let origin: URL;
  try {
    origin = new URL(pageUrl);
  } catch {
    return [];
  }
  const urls: string[] = [];
  const seen = new Set<string>();
  const clean = stripNoise(html);
  for (const match of clean.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
    const href = match[1]?.trim() ?? "";
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      continue;
    }
    let next: URL;
    try {
      next = new URL(href, origin);
    } catch {
      continue;
    }
    if (next.origin !== origin.origin) continue;
    if (SKIP_PATH_EXT.test(next.pathname)) continue;
    next.hash = "";
    const normalized = next.toString();
    if (normalized === origin.toString()) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    urls.push(normalized);
    if (urls.length >= limit) break;
  }
  return urls;
}

function addCandidate(
  candidates: WebsiteOfferCandidate[],
  seen: Set<string>,
  name: string,
  description: string,
  conversionUrl: string,
  source: WebsitePageSource,
  confidence: number,
) {
  const key = normalizeOfferKey(name);
  if (!key || isGenericWebsiteLabel(name) || looksLikeBrandTitle(name)) return;
  if (key.length < 3 || name.length > 80) return;
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
  limit = 6,
): WebsiteOfferCandidate[] {
  const candidates: WebsiteOfferCandidate[] = [];
  const seen = new Set<string>();

  for (const page of pages) {
    const isHome = page.isHome;

    if (!isHome && page.title) {
      addCandidate(
        candidates,
        seen,
        page.title,
        page.description || `Suggested from the connected page ${page.url}.`,
        page.url,
        page.source,
        page.source === "groovgro_builder" ? 65 : 75,
      );
    }

    const heading = page.headings[0];
    if (heading && heading !== page.title) {
      addCandidate(
        candidates,
        seen,
        heading,
        page.description || `Suggested from a heading on ${page.url}.`,
        page.url,
        page.source,
        isHome ? 50 : 70,
      );
    }
  }

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

  return candidates.slice(0, limit);
}

export function websiteBrainNotes(pages: WebsitePageExtract[]): string[] {
  const notes: string[] = [];
  if (pages.length === 0) return notes;
  const connected = pages.filter((page) => page.source === "connected_website");
  const builder = pages.filter((page) => page.source === "groovgro_builder");
  if (connected.length > 0) {
    notes.push(
      `It read ${connected.length} connected website page${connected.length === 1 ? "" : "s"} and did not change them.`,
    );
    const home = connected.find((page) => page.isHome) ?? connected[0];
    if (home?.title) notes.push(`The connected homepage title is “${home.title}.”`);
    if (home?.description) notes.push(home.description);
  }
  if (builder.length > 0) {
    notes.push(
      `It also looked at ${builder.length} GroovGro-hosted page name${builder.length === 1 ? "" : "s"} without overwriting the connected site.`,
    );
  }
  return notes;
}
