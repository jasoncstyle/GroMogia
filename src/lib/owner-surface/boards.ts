export type EvidenceKind = "measured" | "estimated" | "unknown";

export type PulseItem = {
  id: string
  label: string
  value: string
  hint: string
  evidence: EvidenceKind
};

export type PulseFacts = {
  openLeadCount?: number
  customerCount?: number
  paymentCount?: number
  paymentTotalLabel?: string
  stripeConnected?: boolean
  goalTitle?: string
  goalProgressLabel?: string
  goalProgressPercent?: number | null
  goalLiveComputable?: boolean
  websiteConnected?: boolean
  websiteRead?: boolean
  searchClicks?: number | null
};

export function businessPulse(facts: PulseFacts): PulseItem[] {
  const items: PulseItem[] = [];

  if (facts.goalTitle) {
    items.push({
      id: "goal",
      label: "Goal",
      value:
        facts.goalProgressPercent != null
          ? `${facts.goalProgressPercent}%`
          : facts.goalTitle,
      hint:
        facts.goalProgressLabel ??
        (facts.goalLiveComputable
          ? "From the stored Goal number."
          : "A Goal is saved. GroovGro does not have a live number yet."),
      evidence:
        facts.goalProgressPercent != null
          ? facts.goalLiveComputable
            ? "measured"
            : "estimated"
          : "unknown",
    });
  }

  if ((facts.openLeadCount ?? 0) > 0) {
    const count = facts.openLeadCount ?? 0;
    items.push({
      id: "leads",
      label: "People waiting",
      value: String(count),
      hint:
        count === 1
          ? "One open lead is stored for this business."
          : `${count} open leads are stored for this business.`,
      evidence: "measured",
    });
  }

  if (facts.stripeConnected && (facts.paymentCount ?? 0) > 0) {
    items.push({
      id: "payments",
      label: "Payments this month",
      value: facts.paymentTotalLabel ?? String(facts.paymentCount),
      hint: `${facts.paymentCount} stored payment${facts.paymentCount === 1 ? "" : "s"}. GroovGro does not charge cards.`,
      evidence: "measured",
    });
  } else if ((facts.customerCount ?? 0) > 0) {
    items.push({
      id: "customers",
      label: "Customers",
      value: String(facts.customerCount),
      hint: "Won records already stored for this business.",
      evidence: "measured",
    });
  }

  if (items.length < 3 && (facts.searchClicks ?? null) != null) {
    items.push({
      id: "search",
      label: "Search clicks",
      value: String(facts.searchClicks),
      hint: "From the stored Search Console copy. Not a forecast.",
      evidence: "measured",
    });
  }

  if (items.length < 3 && facts.websiteConnected) {
    items.push({
      id: "website",
      label: "Website",
      value: facts.websiteRead ? "Read" : "Saved",
      hint: facts.websiteRead
        ? "GroovGro has read public pages. It did not change the live site."
        : "The address is saved. GroovGro has not read the pages yet.",
      evidence: facts.websiteRead ? "measured" : "unknown",
    });
  }

  return items.slice(0, 3);
}

export type GrowCard = {
  id: string
  title: string
  body: string
  href: string
};

export type GrowBoardInput = {
  primary?: { title: string; body: string; href: string; kind?: string } | null
  waitingActions?: { id: string; title?: string; description: string }[]
  openWork?: { id: string; title?: string; description: string }[]
  weeklyRecommendations?: { title: string; recommendation: string }[]
  searchWatching?: { query: string; why?: string }[]
};

function sameTitle(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function growBoards(input: GrowBoardInput): {
  best: GrowCard | null
  also: GrowCard[]
  watching: GrowCard[]
} {
  const primary = input.primary;
  const best: GrowCard | null = primary
    ? {
        id: "best",
        title: primary.title,
        body: primary.body,
        href: primary.href || "/app/grow/do",
      }
    : null;

  const used = new Set(best ? [best.title.trim().toLowerCase()] : []);
  const also: GrowCard[] = [];

  for (const action of input.waitingActions ?? []) {
    const title = (action.title || action.description).trim();
    if (!title || used.has(title.toLowerCase())) continue;
    used.add(title.toLowerCase());
    also.push({
      id: `waiting-${action.id}`,
      title,
      body: "This still needs your say. Approving does not run it.",
      href: "/app/grow/do",
    });
    if (also.length >= 3) break;
  }

  if (also.length < 3) {
    for (const action of input.openWork ?? []) {
      const title = (action.title || action.description).trim();
      if (!title || used.has(title.toLowerCase())) continue;
      used.add(title.toLowerCase());
      also.push({
        id: `open-${action.id}`,
        title,
        body: "You already approved this. GroovGro is not doing it for you.",
        href: "/app/work?tab=needs-you",
      });
      if (also.length >= 3) break;
    }
  }

  if (also.length < 3) {
    for (const rec of input.weeklyRecommendations ?? []) {
      if (best && sameTitle(rec.title, best.title)) continue;
      if (used.has(rec.title.trim().toLowerCase())) continue;
      used.add(rec.title.trim().toLowerCase());
      also.push({
        id: `weekly-${rec.title}`,
        title: rec.title,
        body: rec.recommendation,
        href: "/app/results",
      });
      if (also.length >= 3) break;
    }
  }

  const watching: GrowCard[] = (input.searchWatching ?? []).slice(0, 3).map((row) => ({
    id: `watch-${row.query}`,
    title: row.query,
    body:
      row.why ||
      "GroovGro is watching this stored search. There is not enough evidence yet to treat it as the next move.",
    href: "/app/grow",
  }));

  return { best, also, watching };
}

export type RecentWinInput = {
  latestLearning?: string
  finishedWorkCount?: number
  goalMovedUp?: boolean
  goalTitle?: string
};

export function recentWin(input: RecentWinInput): { title: string; body: string } | null {
  const learned = (input.latestLearning ?? "").trim();
  if (learned) {
    return {
      title: "What GroovGro learned",
      body: learned,
    };
  }
  if (input.goalMovedUp && input.goalTitle) {
    return {
      title: "The Goal number moved up",
      body: `${input.goalTitle} is higher than the first stored number. This is a look at stored Goal history, not an experiment GroovGro ran.`,
    };
  }
  if ((input.finishedWorkCount ?? 0) > 0) {
    return {
      title: "Finished work is on the record",
      body: `${input.finishedWorkCount} item${input.finishedWorkCount === 1 ? "" : "s"} marked done. GroovGro did not run that work outside this workspace.`,
    };
  }
  return null;
}

export function labelEvidence(kind: EvidenceKind): string {
  if (kind === "measured") return "Measured";
  if (kind === "estimated") return "Estimated";
  return "Unknown";
}

export type WorkTab = "working" | "needs-you" | "finished";

export function parseWorkTab(value?: string | null): WorkTab {
  if (value === "working" || value === "finished") return value;
  return "needs-you";
}

export const BUSINESS_SECTIONS = [
  { id: "about", label: "About" },
  { id: "products", label: "Products & services" },
  { id: "audience", label: "Customers" },
  { id: "brand", label: "Brand" },
  { id: "goals", label: "Goals" },
  { id: "rules", label: "Rules" },
  { id: "knows", label: "What GroovGro knows" },
  { id: "learned", label: "What GroovGro learned" },
] as const;

export type BusinessSectionId = (typeof BUSINESS_SECTIONS)[number]["id"];

export function parseBusinessSection(value?: string | null): BusinessSectionId {
  const match = BUSINESS_SECTIONS.find((section) => section.id === value);
  return match?.id ?? "about";
}
