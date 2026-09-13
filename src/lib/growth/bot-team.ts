/**
 * GroovGro bot team besides SEOgro. DRAFTgro, BOOKSgro, and WRITEgro
 * read stored GroovGro facts and write packs as proposed. Jason reviews
 * on Monday. Only GroovGro sets shipped after the owner acts. None of
 * them send, publish, move money, or log into Google.
 */

export const BOT_STATUS_PROPOSED = "proposed";
export const BOT_STATUS_APPROVED = "approved";
export const BOT_STATUS_REJECTED = "rejected";
export const BOT_STATUS_SHIPPED = "shipped";

export const BOT_STATUSES = [
  BOT_STATUS_PROPOSED,
  BOT_STATUS_APPROVED,
  BOT_STATUS_REJECTED,
  BOT_STATUS_SHIPPED,
] as const;

export type BotItemStatus = (typeof BOT_STATUSES)[number];

export const BOT_SEAT_DRAFT = "draftgro";
export const BOT_SEAT_BOOKS = "booksgro";
export const BOT_SEAT_WRITE = "writegro";

export const BOT_SEATS = [BOT_SEAT_DRAFT, BOT_SEAT_BOOKS, BOT_SEAT_WRITE] as const;
export type BotSeat = (typeof BOT_SEATS)[number];

export const BOT_PATH_BY_SEAT: Record<BotSeat, string> = {
  draftgro: "draft",
  booksgro: "books",
  writegro: "write",
};

export const BOT_SEAT_BY_PATH: Record<string, BotSeat> = {
  draft: BOT_SEAT_DRAFT,
  books: BOT_SEAT_BOOKS,
  write: BOT_SEAT_WRITE,
};

export const BOT_ITEM_TYPES: Record<BotSeat, readonly string[]> = {
  draftgro: ["social_post", "newsletter", "reel_script"],
  booksgro: ["categorize", "reconcile", "report"],
  writegro: ["page_draft", "article", "landing"],
};

export const BOT_SOURCES: Record<BotSeat, readonly string[]> = {
  draftgro: ["brand_voice", "offers"],
  booksgro: ["stripe_copies"],
  writegro: ["brand_voice", "briefs", "public_pages"],
};

export type BotProposalItem = {
  id: string
  type: string
  priority: number
  evidence: string
  draft: string
  expectedEffect: string
  status: BotItemStatus
};

export type BotProposalPack = {
  seat: BotSeat
  property: string
  source: string
  sourceRange: string
  items: BotProposalItem[]
};

export function describeBotTeam() {
  return {
    seogro: {
      seat: "SEOgro",
      status: "live",
      role: "SEO analyst. Read GroovGro payloads. Return proposed packs.",
      path: "scout",
    },
    draftgro: {
      seat: "DRAFTgro",
      status: "live",
      role: "Draft social, newsletters, and reel scripts. Do not send.",
      path: "draft",
    },
    writegro: {
      seat: "WRITEgro",
      status: "live",
      role: "Write page and article copy from saved brand, offers, and briefs. Do not publish.",
      path: "write",
    },
    booksgro: {
      seat: "BOOKSgro",
      status: "live",
      role: "QuickBooks questions and simple reports from stored payment copies. Do not move money.",
      path: "books",
    },
    eggbot: {
      seat: "dr eggbot",
      status: "out",
      role: "Designs bots. Not in the GroovGro data loop.",
      path: "",
    },
  };
}

export function describeBotSeat(seat: BotSeat): {
  name: string
  role: string
  walls: string[]
  handoff: { read: string; write: string; reviewer: string }
} {
  const name =
    seat === BOT_SEAT_DRAFT ? "DRAFTgro" : seat === BOT_SEAT_BOOKS ? "BOOKSgro" : "WRITEgro";
  const role = describeBotTeam()[seat].role;
  return {
    name,
    role,
    walls: [...BOT_WALLS[seat]],
    handoff: {
      read: `GET this URL with the desk token to read stored facts for ${name}. Do not log into Google or QuickBooks.`,
      write: `POST a proposal pack JSON to this URL with the same token. Items must stay proposed. Do not set shipped.`,
      reviewer:
        "Jason reviews on Monday. GroovGro stores the pack. Only GroovGro sets shipped after the owner acts.",
    },
  };
}

export const BOT_WALLS: Record<BotSeat, readonly string[]> = {
  draftgro: [
    "Do not post, schedule, send, or publish.",
    "Do not buy ads or spend money.",
    "Do not write live SEO or patch a website.",
    "Do not invent prices, reviews, or offers that are not in this payload.",
    "Return a proposal pack only. Never set status to shipped.",
    "One property per pack. Do not mix brands.",
    "That is not BOOKSgro or SEOgro work.",
  ],
  booksgro: [
    "Do not file taxes, send invoices, take payments, or move money.",
    "Do not invent balances, bank totals, or QuickBooks numbers.",
    "Use only the stored payment copies in this payload. GroovGro is not the books of record.",
    "Do not log into QuickBooks, Google, or Stripe.",
    "Do not do SEO or marketing.",
    "Return a proposal pack only. Never set status to shipped.",
    "One property per pack. Do not mix brands.",
  ],
  writegro: [
    "Do not publish, patch a live page, or overwrite a connected site.",
    "Do not invent prices, reviews, or offers that are not in this payload.",
    "Do not send email, post social, or buy ads.",
    "Do not set status to shipped.",
    "Write from saved brand, voice, offers, and briefs in this payload.",
    "One property per pack. Do not mix brands.",
    "That is not SEOgro analysis and not DRAFTgro social.",
  ],
};

export function parseBotSeatPath(value: unknown): BotSeat | null {
  const key = String(value ?? "").trim().toLowerCase();
  return BOT_SEAT_BY_PATH[key] ?? null;
}

export function refuseShippedFromBot(status: string, name: string): void {
  if (clean(status, 20).toLowerCase() === BOT_STATUS_SHIPPED) {
    throw new Error(`${name} cannot mark work shipped. GroovGro does that after you act.`);
  }
}

export function nextBotStatus(
  current: BotItemStatus,
  action: "approve" | "reject" | "ship",
): BotItemStatus {
  if (action === "approve") {
    if (current !== BOT_STATUS_PROPOSED) {
      throw new Error("Only a proposed item can be approved.");
    }
    return BOT_STATUS_APPROVED;
  }
  if (action === "reject") {
    if (current !== BOT_STATUS_PROPOSED) {
      throw new Error("Only a proposed item can be rejected.");
    }
    return BOT_STATUS_REJECTED;
  }
  if (current !== BOT_STATUS_APPROVED) {
    throw new Error("Only an approved item can be marked shipped after you use it.");
  }
  return BOT_STATUS_SHIPPED;
}

export function parseBotProposalPack(raw: string, seat: BotSeat): BotProposalPack {
  const meta = describeBotSeat(seat);
  const text = raw.trim();
  if (!text) throw new Error(`Paste the proposal pack from ${meta.name}.`);
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenced?.[1]?.trim() || text;
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`That pack must be JSON from ${meta.name}. GroovGro will not guess a proposal.`);
  }
  const body = parsed as Record<string, unknown>;
  refuseShippedFromBot(String(body.status ?? ""), meta.name);
  const claimed = clean(body.seat, 40).toLowerCase();
  if (claimed && claimed !== seat && claimed !== meta.name.toLowerCase()) {
    throw new Error(`That pack is not for ${meta.name}. Do not mix seats or brands.`);
  }
  const property = clipKey(clean(body.property, 80));
  if (!property) {
    throw new Error("The pack needs a property label so brands are not mixed.");
  }
  const source = normalizeBotSource(body.source, seat);
  const sourceRange = clean(body.sourceRange ?? body.dateRange ?? body.source_range, 80);
  const rows = Array.isArray(body.items) ? body.items : [];
  if (rows.length === 0) {
    throw new Error(`That pack has no items. ${meta.name} should stay quiet when nothing is worth proposing.`);
  }
  const allowed = new Set(BOT_ITEM_TYPES[seat]);
  const items = rows.map((row, index) => {
    const item = (row ?? {}) as Record<string, unknown>;
    refuseShippedFromBot(String(item.status ?? ""), meta.name);
    const type = clean(item.type, 40).toLowerCase().replace(/-/g, "_");
    if (!allowed.has(type)) {
      throw new Error(
        `Item ${index + 1} needs type ${BOT_ITEM_TYPES[seat].join(", ")}.`,
      );
    }
    const evidence = clean(item.evidence, 2000);
    if (!evidence) {
      throw new Error(`Item ${index + 1} needs evidence from the stored GroovGro payload.`);
    }
    return {
      id: clean(item.id, 80) || `item-${index + 1}`,
      type,
      priority: asPriority(item.priority),
      evidence,
      draft: clean(item.draft, 8000),
      expectedEffect: clean(item.expectedEffect ?? item.expected_effect, 400),
      status: BOT_STATUS_PROPOSED as BotItemStatus,
    };
  });
  return { seat, property, source, sourceRange, items };
}

export function normalizeBotSource(value: unknown, seat: BotSeat): string {
  const parts = clean(value, 80)
    .toLowerCase()
    .replace(/[+;/|]+/g, ",")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const allowed = new Set(BOT_SOURCES[seat]);
  const unique = [...new Set(parts.filter((part) => allowed.has(part)))];
  if (unique.length === 0) return BOT_SOURCES[seat][0] ?? "";
  return unique.join("+");
}

export function describeBotInboxHeading(
  seat: BotSeat,
  counts: { proposed: number; approved: number },
): string {
  const name = describeBotSeat(seat).name;
  if (counts.proposed === 0 && counts.approved === 0) return `${name} proposals`;
  return `${name} proposals · ${counts.proposed} to review, ${counts.approved} approved`;
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
