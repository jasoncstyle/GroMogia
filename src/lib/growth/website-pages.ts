import {
  discoveryUrlKey,
  isGenericWebsiteLabel,
  type WebsitePageExtract,
} from "@/lib/growth/website-discover";

export const WEBSITE_PAGE_GROUPS = [
  "home",
  "program",
  "calendar",
  "event",
  "legal",
  "other",
  "third_party",
] as const;

export type WebsitePageGroup = (typeof WEBSITE_PAGE_GROUPS)[number];

export type DiscoveredPageRecord = {
  urlKey: string
  url: string
  label: string
  pageGroup: WebsitePageGroup
  important: boolean
  source: "crawl" | "manual"
  isHome: boolean
  title: string
  description: string
  headings: string[]
};

export type WebsitePageGroupView<T extends { pageGroup: string; label: string }> = {
  id: string
  heading: string
  pages: T[]
  nested?: { heading: string; pages: T[] }
};

const LEGAL_PATH =
  /(^|\/)(about|about-us|contact|contact-us|faq|faqs|privacy|terms|login|signin|sign-in|signup|sign-up|customer|admin|blog|news|cart|checkout|waiver|refund)(\/|$)/i;

const EVENT_PATH =
  /\/(?:events?|classes|workshops|sessions)\/[A-Za-z0-9_-]{4,}/i;

const CALENDAR_PATH = /(calendar|book|schedul|dates)/i;

const PROGRAM_PATH =
  /(train|program|course|workshop|class|offer|service|product|session|event)/i;

function isPageGroup(value: string): value is WebsitePageGroup {
  return (WEBSITE_PAGE_GROUPS as readonly string[]).includes(value);
}

function sortByLabel<T extends { label: string }>(rows: T[]): T[] {
  return [...rows].sort((left, right) => left.label.localeCompare(right.label));
}

function titleLead(title: string): string {
  return title.split(/[|–—]/)[0]?.trim() || title.trim();
}

function humanizePath(slug: string): string {
  return decodeURIComponent(slug)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

export function classifyWebsitePage(
  url: string,
  isHome = false,
  homeOrigin = "",
): WebsitePageGroup {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "other";
  }
  if (isHome || parsed.pathname === "/" || parsed.pathname === "") return "home";
  if (homeOrigin && parsed.origin !== homeOrigin) return "third_party";
  const path = parsed.pathname.toLowerCase();
  if (LEGAL_PATH.test(path)) return "legal";
  if (EVENT_PATH.test(path)) return "event";
  if (CALENDAR_PATH.test(path)) return "calendar";
  if (PROGRAM_PATH.test(path)) return "program";
  return "other";
}

export function suggestImportant(pageGroup: WebsitePageGroup): boolean {
  return (
    pageGroup === "home" ||
    pageGroup === "program" ||
    pageGroup === "calendar" ||
    pageGroup === "event" ||
    pageGroup === "third_party"
  );
}

export function pageLabel(
  url: string,
  title: string,
  pageGroup: WebsitePageGroup,
): string {
  if (pageGroup === "home") {
    return titleLead(title) || "Home";
  }
  const lead = titleLead(title);
  if (lead && !isGenericWebsiteLabel(lead) && lead.length <= 80) {
    return lead;
  }
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split("/").filter(Boolean).pop();
    if (last) return humanizePath(last);
    if (pageGroup === "third_party") {
      return parsed.hostname.replace(/^www\./, "");
    }
  } catch {
    // Use the fallback below.
  }
  return "Page";
}

export function discoveredPageFromExtract(
  page: WebsitePageExtract,
  homeOrigin: string,
  source: "crawl" | "manual" = "crawl",
): DiscoveredPageRecord {
  const urlKey = discoveryUrlKey(page.url) ?? page.url.toLowerCase();
  const pageGroup = classifyWebsitePage(page.url, page.isHome, homeOrigin);
  return {
    urlKey,
    url: page.url,
    label: pageLabel(page.url, page.title, pageGroup),
    pageGroup,
    important: suggestImportant(pageGroup),
    source,
    isHome: page.isHome,
    title: page.title,
    description: page.description,
    headings: page.headings,
  };
}

export function recordFromStoredPage(row: {
  url: string
  urlKey: string
  label: string
  pageGroup: string
  important: boolean
  source: string
  isHome: boolean
  title: string
  description: string
  headings: string[] | null
}): DiscoveredPageRecord {
  return {
    urlKey: row.urlKey,
    url: row.url,
    label: row.label,
    pageGroup: isPageGroup(row.pageGroup) ? row.pageGroup : "other",
    important: row.important,
    source: row.source === "manual" ? "manual" : "crawl",
    isHome: row.isHome,
    title: row.title,
    description: row.description,
    headings: Array.isArray(row.headings) ? row.headings : [],
  };
}

export function extractFromDiscoveredPage(row: {
  url: string
  title: string
  description: string
  headings: string[] | null
  isHome: boolean
}): WebsitePageExtract {
  return {
    url: row.url,
    title: row.title,
    description: row.description,
    headings: Array.isArray(row.headings) ? row.headings : [],
    navLabels: [],
    source: "connected_website",
    isHome: row.isHome,
  };
}

export function mergeDiscoveredPages(
  existing: DiscoveredPageRecord[],
  incoming: DiscoveredPageRecord[],
): { toInsert: DiscoveredPageRecord[]; toUpdate: DiscoveredPageRecord[] } {
  const byKey = new Map(existing.map((row) => [row.urlKey, row]));
  const toInsert: DiscoveredPageRecord[] = [];
  const toUpdate: DiscoveredPageRecord[] = [];

  for (const next of incoming) {
    const previous = byKey.get(next.urlKey);
    if (!previous) {
      toInsert.push(next);
      continue;
    }
    toUpdate.push({
      ...previous,
      url: next.url,
      label:
        previous.source === "manual" && previous.label
          ? previous.label
          : next.label,
      pageGroup: next.pageGroup,
      important: previous.important,
      title: next.title || previous.title,
      description: next.description || previous.description,
      headings: next.headings.length > 0 ? next.headings : previous.headings,
      isHome: next.isHome,
      source: previous.source === "manual" ? "manual" : next.source,
    });
  }

  return { toInsert, toUpdate };
}

export function groupWebsitePages<
  T extends { pageGroup: string; label: string },
>(pages: T[]): WebsitePageGroupView<T>[] {
  const home = sortByLabel(pages.filter((page) => page.pageGroup === "home"));
  const program = sortByLabel(
    pages.filter((page) => page.pageGroup === "program"),
  );
  const calendar = sortByLabel(
    pages.filter((page) => page.pageGroup === "calendar"),
  );
  const event = sortByLabel(pages.filter((page) => page.pageGroup === "event"));
  const thirdParty = sortByLabel(
    pages.filter((page) => page.pageGroup === "third_party"),
  );
  const other = sortByLabel(pages.filter((page) => page.pageGroup === "other"));
  const legal = sortByLabel(pages.filter((page) => page.pageGroup === "legal"));

  const groups: WebsitePageGroupView<T>[] = [];
  if (home.length > 0) {
    groups.push({ id: "home", heading: "Home", pages: home });
  }
  if (program.length > 0) {
    groups.push({ id: "program", heading: "Program pages", pages: program });
  }
  if (calendar.length > 0 || event.length > 0) {
    groups.push({
      id: "calendar",
      heading: calendar.length > 0 ? "Calendar" : "Event pages",
      pages: calendar.length > 0 ? calendar : event,
      nested:
        calendar.length > 0 && event.length > 0
          ? { heading: "Event pages", pages: event }
          : undefined,
    });
  }
  if (thirdParty.length > 0) {
    groups.push({
      id: "third_party",
      heading: "Booking pages on another site",
      pages: thirdParty,
    });
  }
  if (other.length > 0) {
    groups.push({ id: "other", heading: "Other pages", pages: other });
  }
  if (legal.length > 0) {
    groups.push({
      id: "legal",
      heading: "About, login, and legal",
      pages: legal,
    });
  }
  return groups;
}

export function hasStoredExtract(row: {
  title: string
  headings: string[] | null
}): boolean {
  return Boolean(row.title) || (Array.isArray(row.headings) && row.headings.length > 0);
}
