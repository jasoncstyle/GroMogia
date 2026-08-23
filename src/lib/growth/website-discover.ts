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

const SKIP_PATH =
  /(^|\/)(about|about-us|contact|contact-us|faq|faqs|privacy|terms|login|signin|sign-in|signup|sign-up|customer|admin|blog|news|cart|checkout)(\/|$)/i;

function pathPriority(pathname: string): number {
  const path = pathname.toLowerCase();
  if (SKIP_PATH.test(path)) return -1;
  let score = 1;
  if (/(train|program|course|workshop|class|offer|service|product|session)/.test(path)) {
    score += 3;
  }
  if (path.split("/").filter(Boolean).length >= 2) score += 2;
  return score;
}

export function sameOriginPageUrls(
  html: string,
  pageUrl: string,
  limit = 6,
): string[] {
  let origin: URL;
  try {
    origin = new URL(pageUrl);
  } catch {
    return [];
  }
  const found: { url: string; score: number }[] = [];
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
    const score = pathPriority(next.pathname);
    if (score < 0) continue;
    next.hash = "";
    const normalized = next.toString();
    if (normalized === origin.toString()) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    found.push({ url: normalized, score });
  }
  return found
    .sort((left, right) => right.score - left.score)
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
  const homeTitle = pages.find((page) => page.isHome)?.title ?? "";

  for (const page of pages) {
    if (
      !page.isHome &&
      page.title &&
      normalizeOfferKey(page.title) !== normalizeOfferKey(homeTitle)
    ) {
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

    for (const heading of page.headings) {
      addCandidate(
        candidates,
        seen,
        heading,
        page.description || `Suggested from a heading on ${page.url}.`,
        page.url,
        page.source,
        page.isHome ? 55 : 70,
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
