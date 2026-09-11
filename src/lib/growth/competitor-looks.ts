/**
 * Competitor looks from owner-saved public URLs.
 * GroovGro may read a page the owner named. Search-engine discovery
 * stays behind an off adapter. Do not copy competitor words onto a
 * live site or treat one page as the whole market.
 */
import { extractWebsitePage, isGenericWebsiteLabel } from "@/lib/growth/website-discover";
import { isSafePublicHttpUrl } from "@/lib/seo/audit";

export const COMPETITOR_SOURCE_OWNER = "owner";
export const COMPETITOR_STATUS_SAVED = "saved";
export const COMPETITOR_STATUS_LOOKED = "looked";
export const COMPETITOR_MAX_SHOWN = 12;
export const COMPETITOR_MAX_SEARCHES = 6;

export type CompetitorSiteDraft = {
  organizationId: string
  name: string
  url: string
  host: string
  note: string
  status: typeof COMPETITOR_STATUS_SAVED
  source: typeof COMPETITOR_SOURCE_OWNER
};

export type CompetitorLookFacts = {
  title: string
  description: string
  headings: string[]
  navLabels: string[]
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

export function planCompetitorSite(input: {
  organizationId: string
  name?: string | null
  url?: string | null
  note?: string | null
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
  return {
    organizationId: input.organizationId,
    name,
    url: parsed.toString(),
    host,
    note: (input.note ?? "").trim(),
    status: COMPETITOR_STATUS_SAVED,
    source: COMPETITOR_SOURCE_OWNER,
  };
}

export function lookFromHtml(url: string, html: string): CompetitorLookFacts {
  const page = extractWebsitePage(url, html);
  return {
    title: page.title,
    description: page.description,
    headings: page.headings.slice(0, 8),
    navLabels: page.navLabels.slice(0, 10),
  };
}

export function describeCompetitorModel(look: CompetitorLookFacts): string {
  const topics = look.headings.filter((heading) => !isGenericWebsiteLabel(heading));
  if (topics[0]) {
    return `This public homepage leads with “${topics[0]}”.`;
  }
  if (look.description) {
    return `This public homepage describes itself as “${look.description}”.`;
  }
  if (look.title) {
    return `This public homepage titles itself “${look.title}”.`;
  }
  return "This public homepage did not name a clear offer.";
}

export function describeCompetitorMarketing(look: CompetitorLookFacts): string {
  const blob = [...look.headings, ...look.navLabels, look.description]
    .join(" ")
    .toLowerCase();
  const bits: string[] = [];
  if (/(book|reserv|schedul|appoint|enroll)/i.test(blob)) {
    bits.push("It asks people to book or schedule.");
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
  if (bits.length === 0) {
    return "The public homepage did not show a clear marketing move.";
  }
  return bits.join(" ");
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
  const next = ours[0]
    ? `A next look is to make “${ours[0]}” easier to see than their lead.`
    : difference
      ? `A next look is to make “${difference}” easier to see on your site.`
      : "A next look is to name your offer more clearly than this homepage does.";
  return `${name}: ${model} ${marketing} ${next} This is a stored look at a page you named, not a reason to copy their words, buy ads, or change checkout.`;
}

export function planCompetitorLook(input: {
  name: string
  url: string
  html: string
  ourOffers?: string[]
  ourDifference?: string[]
}): CompetitorLookDraft {
  const look = lookFromHtml(input.url, input.html);
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
    hints.push({
      query: industry,
      why: "Saved business type. A later allowed search adapter can use this first.",
    });
  }
  for (const raw of input.storedQueries ?? []) {
    const query = raw.replace(/\s+/g, " ").trim();
    if (!query) continue;
    if (hints.some((hint) => hint.query.toLowerCase() === query.toLowerCase())) {
      continue;
    }
    hints.push({
      query,
      why: "A stored Search Console query. GroovGro has not searched it for other businesses.",
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
