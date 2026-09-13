/**
 * SEOgro proposal packs. GroovGro is the pipe and applicator. SEOgro
 * reads stored Search Console and public URL inventory GroovGro already
 * pulled, then writes packs through the handoff. Items stay proposed
 * until the Monday reviewer approves. Only GroovGro may mark shipped,
 * after a real apply. SEOgro does not log into Google, publish, or set
 * shipped. DRAFTgro and BOOKSgro handoffs are later. Paste is a sample
 * of the live API, not the product.
 */

export const SCOUT_SOURCE_GSC = "gsc";
export const SCOUT_SOURCE_PUBLIC_PAGES = "public_pages";
export const SCOUT_ITEM_SUGGESTION = "suggestion";
export const SCOUT_ITEM_ON_PAGE = "on_page_draft";
export const SCOUT_ITEM_TECHNICAL = "technical";
export const SCOUT_STATUS_PROPOSED = "proposed";
export const SCOUT_STATUS_APPROVED = "approved";
export const SCOUT_STATUS_REJECTED = "rejected";
export const SCOUT_STATUS_SHIPPED = "shipped";

export const SCOUT_ITEM_TYPES = [
  SCOUT_ITEM_SUGGESTION,
  SCOUT_ITEM_ON_PAGE,
  SCOUT_ITEM_TECHNICAL,
] as const;

export const SCOUT_STATUSES = [
  SCOUT_STATUS_PROPOSED,
  SCOUT_STATUS_APPROVED,
  SCOUT_STATUS_REJECTED,
  SCOUT_STATUS_SHIPPED,
] as const;

export type ScoutItemType = (typeof SCOUT_ITEM_TYPES)[number];
export type ScoutItemStatus = (typeof SCOUT_STATUSES)[number];

export type ScoutProposalItem = {
  id: string
  type: ScoutItemType
  priority: number
  evidence: string
  draft: string
  expectedEffect: string
  status: ScoutItemStatus
};

export type ScoutProposalPack = {
  property: string
  source: string
  sourceRange: string
  items: ScoutProposalItem[]
};

export type ScoutGscExport = {
  source: typeof SCOUT_SOURCE_GSC
  pulledAt: string
  propertyUrl: string
  startDate: string
  endDate: string
  totals: {
    clicks: number
    impressions: number
    ctr: number
    position: number
  }
  queries: Array<{
    query: string
    clicks: number
    impressions: number
    ctr: number
    position: number
  }>
  pages: Array<{
    page: string
    clicks: number
    impressions: number
    ctr: number
    position: number
  }>
  gaps: string[]
  walls: string[]
};

export type ScoutPublicPage = {
  url: string
  title: string
  label: string
};

export type ScoutDeskPayload = {
  gsc: ScoutGscExport | null
  publicPages: ScoutPublicPage[]
};

export const SCOUT_WALLS = [
  "Do not log into Google, Search Console, Analytics, or Ads.",
  "Do not fetch or refresh Search Console. GroovGro already pulled this.",
  "Public pages and sitemaps only. Do not fetch anything behind a login.",
  "Do not publish, patch a live page, or change a sitemap or robots file.",
  "Return a proposal pack only. Never set status to shipped.",
  "Do not invent metrics, rankings, or backlinks that are not in this payload.",
  "Do not write social posts, newsletters, or ads. That is DRAFTgro, later.",
  "Do not categorize books or move money. That is BOOKSgro, later.",
  "One property per pack. Do not mix brands.",
  "POST the proposal pack back to GroovGro. Do not ask Jason to carry the file.",
] as const;

export function describeBotTeam() {
  return {
    seogro: {
      seat: "SEOgro",
      status: "live",
      role: "SEO analyst. Read GroovGro payloads. Return proposed packs.",
    },
    draftgro: {
      seat: "DRAFTgro",
      status: "later",
      role: "Draft social, newsletters, and reel scripts. Do not send.",
    },
    booksgro: {
      seat: "BOOKSgro",
      status: "later",
      role: "QuickBooks questions and simple reports. Do not move money.",
    },
  };
}

export function describeScoutHandoff(): {
  read: string
  write: string
  reviewer: string
} {
  return {
    read: "GET this URL with the desk token to read stored Search Console and public URL inventory. Do not log into Google.",
    write: "POST a proposal pack JSON to this URL with the same token. Items must stay proposed. Do not set shipped.",
    reviewer: "Jason reviews on Monday. GroovGro is the applicator. Only GroovGro sets shipped after a real apply.",
  };
}

export function normalizeScoutSource(value: unknown): string {
  const parts = clean(value, 80)
    .toLowerCase()
    .replace(/[+;/|]+/g, ",")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const allowed = new Set<string>([SCOUT_SOURCE_GSC, SCOUT_SOURCE_PUBLIC_PAGES]);
  const unique = [...new Set(parts.filter((part) => allowed.has(part)))];
  if (unique.length === 0) return SCOUT_SOURCE_GSC;
  return unique.join("+");
}

function clean(value: unknown, max: number): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function clipKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function asPriority(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(99, Math.max(1, Math.round(value)));
  }
  const text = clean(value, 16).toLowerCase();
  if (text === "high") return 20;
  if (text === "low") return 80;
  if (text === "medium" || text === "med") return 50;
  const number = Number(text);
  if (Number.isFinite(number)) return Math.min(99, Math.max(1, Math.round(number)));
  return 50;
}

function asType(value: unknown): ScoutItemType | null {
  const text = clean(value, 40).toLowerCase().replace(/-/g, "_");
  if (text === SCOUT_ITEM_SUGGESTION) return SCOUT_ITEM_SUGGESTION;
  if (text === SCOUT_ITEM_ON_PAGE || text === "onpage" || text === "draft") {
    return SCOUT_ITEM_ON_PAGE;
  }
  if (text === SCOUT_ITEM_TECHNICAL || text === "tech") return SCOUT_ITEM_TECHNICAL;
  return null;
}

export function refuseShippedFromScout(status: string): void {
  if (clean(status, 20).toLowerCase() === SCOUT_STATUS_SHIPPED) {
    throw new Error("SEOgro cannot mark work shipped. GroovGro does that after a real apply.");
  }
}

export function nextScoutStatus(
  current: ScoutItemStatus,
  action: "approve" | "reject" | "ship",
): ScoutItemStatus {
  if (action === "approve") {
    if (current !== SCOUT_STATUS_PROPOSED) {
      throw new Error("Only a proposed item can be approved.");
    }
    return SCOUT_STATUS_APPROVED;
  }
  if (action === "reject") {
    if (current !== SCOUT_STATUS_PROPOSED) {
      throw new Error("Only a proposed item can be rejected.");
    }
    return SCOUT_STATUS_REJECTED;
  }
  if (current !== SCOUT_STATUS_APPROVED) {
    throw new Error("Only an approved item can be marked shipped after a real apply.");
  }
  return SCOUT_STATUS_SHIPPED;
}

export function parseScoutProposalPack(raw: string): ScoutProposalPack {
  const text = raw.trim();
  if (!text) throw new Error("Paste the proposal pack from SEOgro.");
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenced?.[1]?.trim() || text;
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("That pack must be JSON from SEOgro. GroovGro will not guess a proposal.");
  }
  const body = parsed as Record<string, unknown>;
  refuseShippedFromScout(String(body.status ?? ""));
  const property = clipKey(clean(body.property, 80));
  if (!property) {
    throw new Error("The pack needs a property label so brands are not mixed.");
  }
  const source = normalizeScoutSource(body.source);
  const sourceRange = clean(body.sourceRange ?? body.dateRange ?? body.source_range, 80);
  const rows = Array.isArray(body.items) ? body.items : [];
  if (rows.length === 0) {
    throw new Error("That pack has no items. SEOgro should stay quiet when nothing is worth proposing.");
  }
  const items = rows.map((row, index) => {
    const item = (row ?? {}) as Record<string, unknown>;
    refuseShippedFromScout(String(item.status ?? ""));
    const type = asType(item.type);
    if (!type) {
      throw new Error(`Item ${index + 1} needs type suggestion, on_page_draft, or technical.`);
    }
    const evidence = clean(item.evidence, 2000);
    if (!evidence) {
      throw new Error(
        `Item ${index + 1} needs evidence from the stored Search Console or public page payload.`,
      );
    }
    const id = clean(item.id, 80) || `item-${index + 1}`;
    return {
      id,
      type,
      priority: asPriority(item.priority),
      evidence,
      draft: clean(item.draft, 4000),
      expectedEffect: clean(item.expectedEffect ?? item.expected_effect, 400),
      status: SCOUT_STATUS_PROPOSED as ScoutItemStatus,
    };
  });
  return { property, source, sourceRange, items };
}

export function buildScoutGscExport(input: {
  pulledAt?: Date | string | null
  propertyUrl?: string | null
  startDate?: string | null
  endDate?: string | null
  totals?: { clicks?: number; impressions?: number; ctr?: number; position?: number } | null
  queries?: Array<{
    key?: string
    query?: string
    clicks?: number
    impressions?: number
    ctr?: number
    position?: number
  }> | null
  pages?: Array<{
    key?: string
    page?: string
    clicks?: number
    impressions?: number
    ctr?: number
    position?: number
  }> | null
}): ScoutGscExport {
  const queries = (input.queries ?? []).slice(0, 25).map((row) => ({
    query: clean(row.query ?? row.key, 200),
    clicks: Number(row.clicks) || 0,
    impressions: Number(row.impressions) || 0,
    ctr: Number(row.ctr) || 0,
    position: Number(row.position) || 0,
  }));
  const pages = (input.pages ?? []).slice(0, 25).map((row) => ({
    page: clean(row.page ?? row.key, 400),
    clicks: Number(row.clicks) || 0,
    impressions: Number(row.impressions) || 0,
    ctr: Number(row.ctr) || 0,
    position: Number(row.position) || 0,
  }));
  const gaps: string[] = [];
  if (queries.length === 0) {
    gaps.push("No query rows in this stored snapshot. Refresh Search Console in GroovGro.");
  }
  if (pages.length === 0) {
    gaps.push("No page-level rows in this stored snapshot.");
  } else if (pages.every((row) => row.ctr === 0 && row.impressions === 0)) {
    gaps.push("No page-level CTR in this export.");
  }
  const pulled =
    input.pulledAt instanceof Date
      ? input.pulledAt.toISOString()
      : clean(input.pulledAt, 40);
  return {
    source: SCOUT_SOURCE_GSC,
    pulledAt: pulled,
    propertyUrl: clean(input.propertyUrl, 400),
    startDate: clean(input.startDate, 20),
    endDate: clean(input.endDate, 20),
    totals: {
      clicks: Number(input.totals?.clicks) || 0,
      impressions: Number(input.totals?.impressions) || 0,
      ctr: Number(input.totals?.ctr) || 0,
      position: Number(input.totals?.position) || 0,
    },
    queries,
    pages,
    gaps,
    walls: [...SCOUT_WALLS],
  };
}

export function buildScoutPublicPages(
  rows: Array<{ url?: string | null; title?: string | null; label?: string | null }> | null,
): ScoutPublicPage[] {
  return (rows ?? [])
    .map((row) => ({
      url: clean(row.url, 400),
      title: clean(row.title, 200),
      label: clean(row.label, 80),
    }))
    .filter((row) => row.url)
    .slice(0, 80);
}

export function describeScoutInboxHeading(counts: {
  proposed: number
  approved: number
}): string {
  if (counts.proposed === 0 && counts.approved === 0) {
    return "SEOgro proposals";
  }
  return `SEOgro proposals · ${counts.proposed} to review, ${counts.approved} approved`;
}
