/**
 * Competitor looks from owner-saved public URLs.
 * GroovGro may read a page the owner named. Search-engine discovery
 * stays behind an off adapter. Do not copy competitor words onto a
 * live site or treat one page as the whole market.
 */
import {
  extractWebsitePage,
  isGenericWebsiteLabel,
  linkedDiscoveryUrls,
  pathPriority,
} from "@/lib/growth/website-discover";
import { isSafePublicHttpUrl } from "@/lib/seo/audit";

export const COMPETITOR_SOURCE_OWNER = "owner";
export const COMPETITOR_SOURCE_OWNER_SEARCH = "owner_search";
export const COMPETITOR_STATUS_SAVED = "saved";
export const COMPETITOR_STATUS_LOOKED = "looked";
export const COMPETITOR_MAX_SHOWN = 12;
export const COMPETITOR_MAX_SEARCHES = 6;
export const COMPETITOR_MAX_INNER_PAGES = 3;

export type CompetitorSiteDraft = {
  organizationId: string
  name: string
  url: string
  host: string
  note: string
  status: typeof COMPETITOR_STATUS_SAVED
  source: typeof COMPETITOR_SOURCE_OWNER | typeof COMPETITOR_SOURCE_OWNER_SEARCH
};

export type CompetitorLookFacts = {
  title: string
  description: string
  headings: string[]
  navLabels: string[]
  bodyText: string
  pageCount: number
};

export type CompetitorLookDraft = CompetitorLookFacts & {
  modelGuess: string
  marketingGuess: string
  competeNote: string
  status: typeof COMPETITOR_STATUS_LOOKED
};

export type CompetitorSiteView = {
  id: string
  name: string
  url: string
  host: string
  note: string
  title: string
  description: string
  headings: string[]
  navLabels: string[]
  modelGuess: string
  marketingGuess: string
  competeNote: string
  status: string
  lookedAt: Date | null
};

export type CompetitorSearchHint = {
  query: string
  why: string
  ownerSearchHref: string
};

const BLOCKED_HOST =
  /(google\.|googleapis\.|gstatic\.|bing\.|yahoo\.|duckduckgo\.|facebook\.|instagram\.|twitter\.|x\.com|linkedin\.|tiktok\.|youtube\.|youtu\.be)/i;

export function normalizeCompetitorUrl(value: string): URL | null {
  const trimmed = value.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  const parsed = isSafePublicHttpUrl(withProtocol);
  if (!parsed) return null;
  if (BLOCKED_HOST.test(parsed.hostname)) return null;
  parsed.hash = "";
  return parsed;
}

export function competitorHost(url: URL): string {
  return url.hostname.replace(/^www\./i, "").toLowerCase();
}

export function ownerCompetitorSearchHref(query: string): string | null {
  const q = query.replace(/\s+/g, " ").trim();
  if (!q) return null;
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

export function noteFromOwnerSearch(note: string, query: string): string {
  const found = query.replace(/\s+/g, " ").trim();
  const extra = note.replace(/\s+/g, " ").trim();
  const prefix = found ? `Found from a search you ran: “${found}”.` : "";
  return [prefix, extra].filter(Boolean).join(" ");
}

export function planCompetitorSite(input: {
  organizationId: string
  name?: string | null
  url?: string | null
  note?: string | null
  foundFrom?: string | null
  ownHost?: string | null
}): CompetitorSiteDraft {
  if (!input.organizationId) {
    throw new Error("Missing organization.");
  }
  const parsed = normalizeCompetitorUrl(input.url ?? "");
  if (!parsed) {
    throw new Error(
      "Add a public competitor website. GroovGro will not search Google or read social networks from this box.",
    );
  }
  const host = competitorHost(parsed);
  const ownHost = (input.ownHost ?? "").replace(/^www\./i, "").toLowerCase();
  if (ownHost && host === ownHost) {
    throw new Error("That is this business’s own website. Save a competitor instead.");
  }
  const name =
    (input.name ?? "").replace(/\s+/g, " ").trim() || host;
  const foundFrom = (input.foundFrom ?? "").replace(/\s+/g, " ").trim();
  return {
    organizationId: input.organizationId,
    name,
    url: parsed.toString(),
    host,
    note: foundFrom
      ? noteFromOwnerSearch(input.note ?? "", foundFrom)
      : (input.note ?? "").trim(),
    status: COMPETITOR_STATUS_SAVED,
    source: foundFrom ? COMPETITOR_SOURCE_OWNER_SEARCH : COMPETITOR_SOURCE_OWNER,
  };
}

export function visiblePageText(content: string): string {
  return content
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^Title:\s*/gim, "")
    .replace(/^URL Source:\s*/gim, "")
    .replace(/^Markdown Content:\s*/gim, "")
    .replace(/[#*_`>]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2500);
}

function uniqueLabels(values: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.replace(/\s+/g, " ").trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= max) break;
  }
  return out;
}

export function lookFromHtml(url: string, html: string): CompetitorLookFacts {
  const page = extractWebsitePage(url, html);
  return {
    title: page.title,
    description: page.description,
    headings: page.headings.slice(0, 8),
    navLabels: page.navLabels.slice(0, 10),
    bodyText: visiblePageText(html),
    pageCount: 1,
  };
}

export function lookFromReadableText(url: string, text: string): CompetitorLookFacts {
  const titleLine = text.match(/^Title:\s*(.+)$/m)?.[1]?.trim() ?? "";
  const headings = text
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => /^#{1,3}\s+\S/.test(line))
    .map((line) => line.replace(/^#+\s+/, "").trim())
    .filter(Boolean)
    .slice(0, 8);
  const paragraphs = text
    .split(/\n/)
    .map((line) => line.replace(/^>\s*/, "").trim())
    .filter(
      (line) =>
        line &&
        !/^#{1,3}\s+/.test(line) &&
        !/^Title:/i.test(line) &&
        !/^URL Source:/i.test(line) &&
        !/^Markdown Content:/i.test(line),
    );
  return {
    title: titleLine || headings[0] || new URL(url).hostname,
    description: paragraphs[0] ?? "",
    headings,
    navLabels: [],
    bodyText: visiblePageText(text),
    pageCount: 1,
  };
}

export function lookFromPublicContent(url: string, content: string): CompetitorLookFacts {
  if (/<[a-z][\s\S]*>/i.test(content) && /<title[\s>]|<h1[\s>]|<meta\s/i.test(content)) {
    return lookFromHtml(url, content);
  }
  return lookFromReadableText(url, content);
}

function lookBlob(look: CompetitorLookFacts): string {
  return [look.title, look.description, ...look.headings, ...look.navLabels, look.bodyText]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function describeCompetitorModel(look: CompetitorLookFacts): string {
  const blob = lookBlob(look);
  const lead =
    look.headings.find((heading) => !isGenericWebsiteLabel(heading)) ||
    look.title ||
    "";
  const sells: string[] = [];
  if (/(school|train|course|class|workshop|lesson|expedition)/i.test(blob)) {
    sells.push("training or a course");
  }
  if (/(liveaboard|aboard|trip|voyage|expedition|tour)/i.test(blob)) {
    sells.push("a trip people join");
  }
  if (/(up to \d+|small group|personalized|private)/i.test(blob)) {
    sells.push("a small or personal group");
  }
  if (/(shop|store|buy|cart|product)/i.test(blob) && sells.length === 0) {
    sells.push("products from the page");
  }
  const pages =
    look.pageCount > 1 ? ` GroovGro read ${look.pageCount} public pages on the site you named.` : "";
  if (sells.length && lead) {
    return `This public site sells ${uniqueLabels(sells, 3).join(" and ")}. It leads with “${lead}”.${pages}`;
  }
  if (lead) {
    return `This public homepage leads with “${lead}”.${pages}`;
  }
  if (look.description) {
    return `This public homepage describes itself as “${look.description}”.${pages}`;
  }
  return `This public homepage did not name a clear offer.${pages}`;
}

export function describeCompetitorMarketing(look: CompetitorLookFacts): string {
  const blob = lookBlob(look);
  const bits: string[] = [];
  if (/(book|reserv|schedul|appoint|enroll|join|apply|sign up)/i.test(blob)) {
    bits.push("It asks people to book, join, or apply.");
  }
  if (/(expedition|course|class|workshop|training|lesson)/i.test(blob)) {
    bits.push("It markets a course, class, or expedition.");
  }
  if (/(up to \d+|small group|personalized|private)/i.test(blob)) {
    bits.push("It promises a small or personal group.");
  }
  if (/(blog|guide|resource|learn|news)/i.test(blob)) {
    bits.push("It shows guides or news.");
  }
  if (/(price|pricing|cost|from \$|packages?)/i.test(blob)) {
    bits.push("It shows a price or package.");
  }
  if (/(shop|store|buy|cart)/i.test(blob)) {
    bits.push("It sells from the page.");
  }
  if (/(contact|email|call|phone|get in touch)/i.test(blob)) {
    bits.push("It asks people to get in touch.");
  }
  if (bits.length === 0) {
    return "The public pages GroovGro read did not show a clear marketing move.";
  }
  return uniqueLabels(bits, 4).join(" ");
}

export function planCompeteNote(input: {
  name: string
  look: CompetitorLookFacts
  ourOffers?: string[]
  ourDifference?: string[]
}): string {
  const name = input.name.replace(/\s+/g, " ").trim() || "this competitor";
  const model = describeCompetitorModel(input.look);
  const marketing = describeCompetitorMarketing(input.look);
  const ours = (input.ourOffers ?? [])
    .map((row) => row.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 2);
  const difference = (input.ourDifference ?? [])
    .map((row) => row.replace(/\s+/g, " ").trim())
    .filter(Boolean)[0];
  const lead =
    input.look.headings.find((heading) => !isGenericWebsiteLabel(heading)) ||
    input.look.title ||
    "their lead";
  const next = ours[0]
    ? `A next look is to make “${ours[0]}” easier to see than “${lead}”.`
    : difference
      ? `A next look is to make “${difference}” easier to see than “${lead}”.`
      : `A next look is to name your offer more clearly than “${lead}”.`;
  return `${name}: ${model} ${marketing} ${next} This is a stored look at a site you named, not a reason to copy their words, buy ads, or change checkout.`;
}

export function mergeCompetitorLooks(looks: CompetitorLookFacts[]): CompetitorLookFacts {
  const first = looks[0];
  if (!first) {
    return {
      title: "",
      description: "",
      headings: [],
      navLabels: [],
      bodyText: "",
      pageCount: 0,
    };
  }
  return {
    title: first.title,
    description: first.description,
    headings: uniqueLabels(looks.flatMap((look) => look.headings), 10),
    navLabels: uniqueLabels(looks.flatMap((look) => look.navLabels), 12),
    bodyText: looks
      .map((look) => look.bodyText)
      .filter(Boolean)
      .join(" ")
      .slice(0, 2500),
    pageCount: looks.length,
  };
}

export function proposeCompetitorInnerPages(input: {
  homeUrl: string
  content: string
  limit?: number
}): string[] {
  const home = normalizeCompetitorUrl(input.homeUrl);
  if (!home) return [];
  const limit = input.limit ?? COMPETITOR_MAX_INNER_PAGES;
  const scored = new Map<string, number>();
  const add = (raw: string) => {
    const parsed = normalizeCompetitorUrl(raw.startsWith("http") ? raw : new URL(raw, home).toString());
    if (!parsed) return;
    if (competitorHost(parsed) !== competitorHost(home)) return;
    const key = `${parsed.origin}${parsed.pathname.replace(/\/+$/, "") || "/"}`.toLowerCase();
    const homeKey = `${home.origin}${home.pathname.replace(/\/+$/, "") || "/"}`.toLowerCase();
    if (key === homeKey) return;
    const score = pathPriority(parsed.pathname);
    if (score < 0) return;
    scored.set(parsed.toString(), Math.max(scored.get(parsed.toString()) ?? 0, score));
  };
  for (const row of linkedDiscoveryUrls(input.content, home.toString())) {
    if (row.sameOrigin) add(row.url);
  }
  for (const match of input.content.matchAll(/\]\((https?:[^)\s]+|\/[^)\s]+)\)/gi)) {
    add(match[1] ?? "");
  }
  return [...scored.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([url]) => url);
}

export function planCompetitorLook(input: {
  name: string
  url: string
  html: string
  extraPages?: { url: string; html: string }[]
  ourOffers?: string[]
  ourDifference?: string[]
}): CompetitorLookDraft {
  const look = mergeCompetitorLooks([
    lookFromPublicContent(input.url, input.html),
    ...(input.extraPages ?? []).map((page) => lookFromPublicContent(page.url, page.html)),
  ]);
  return {
    ...look,
    modelGuess: describeCompetitorModel(look),
    marketingGuess: describeCompetitorMarketing(look),
    competeNote: planCompeteNote({
      name: input.name,
      look,
      ourOffers: input.ourOffers,
      ourDifference: input.ourDifference,
    }),
    status: COMPETITOR_STATUS_LOOKED,
  };
}

export function proposeCompetitorSearches(input: {
  storedQueries?: string[]
  industry?: string | null
}): CompetitorSearchHint[] {
  const hints: CompetitorSearchHint[] = [];
  const industry = (input.industry ?? "").replace(/\s+/g, " ").trim();
  if (industry) {
    const href = ownerCompetitorSearchHref(industry);
    if (href) {
      hints.push({
        query: industry,
        why: "Best first search from the saved business type. You run it. GroovGro will not.",
        ownerSearchHref: href,
      });
    }
  }
  for (const raw of input.storedQueries ?? []) {
    const query = raw.replace(/\s+/g, " ").trim();
    if (!query) continue;
    if (hints.some((hint) => hint.query.toLowerCase() === query.toLowerCase())) {
      continue;
    }
    const href = ownerCompetitorSearchHref(query);
    if (!href) continue;
    hints.push({
      query,
      why: "A stored Search Console query. You can run this search. GroovGro will not.",
      ownerSearchHref: href,
    });
    if (hints.length >= COMPETITOR_MAX_SEARCHES) break;
  }
  return hints.slice(0, COMPETITOR_MAX_SEARCHES);
}

export function competitorSitesToShow(
  rows: CompetitorSiteView[],
): CompetitorSiteView[] {
  return [...rows]
    .sort((left, right) => {
      const leftLook = left.status === COMPETITOR_STATUS_LOOKED ? 1 : 0;
      const rightLook = right.status === COMPETITOR_STATUS_LOOKED ? 1 : 0;
      return rightLook - leftLook || left.name.localeCompare(right.name);
    })
    .slice(0, COMPETITOR_MAX_SHOWN);
}
