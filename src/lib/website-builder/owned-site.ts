import type { BuilderSectionContent, BuilderSectionType } from "@/lib/db/schema";
import type { InspiredCopy, InspiredCopyFacts, InspiredOfferInput } from "@/lib/website-builder/inspired-copy";
import type { BuilderRowDraft, BuilderWidgetDraft } from "@/lib/website-builder/row-templates";
import type { RowContentWidth } from "@/lib/website-builder/layout";
import { builderTelHref } from "@/lib/website-builder/embeds";
import { isSafeBuilderHref } from "@/lib/website-builder/sections";
import {
  builderPagePath,
  isArchivedHomeSlug,
  suggestPageSlug,
} from "@/lib/website-builder/pages";

export const OWNED_ABOUT_SLUG = "about";
export const OWNED_WORK_SLUG = "work";
export const OWNED_CONTACT_SLUG = "contact";
export const OWNED_FAQ_SLUG = "faq";
export const OWNED_AREAS_SLUG = "areas";
export const MAX_OWNED_OFFER_PAGES = 3;

const FALLBACK_TOPICS = ["What we do", "Who we help", "How it works"];
const OWNED_CORE_SLUGS = new Set([
  OWNED_ABOUT_SLUG,
  OWNED_WORK_SLUG,
  OWNED_CONTACT_SLUG,
  OWNED_FAQ_SLUG,
  OWNED_AREAS_SLUG,
]);

export type OwnedPageDraft = {
  title: string
  slug: string
  metaDescription: string
  rows: BuilderRowDraft[]
};

export type OwnedSiteInput = {
  orgSlug: string
  copy: InspiredCopy
  facts: InspiredCopyFacts
};

function clip(value: string, max: number): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function widget(
  type: BuilderSectionType,
  columnIndex: number,
  content: BuilderSectionContent,
): BuilderWidgetDraft {
  return { type, columnIndex, visible: true, content };
}

function band(
  widgets: BuilderWidgetDraft[],
  options: { columns?: number[]; contentWidth?: RowContentWidth } = {},
): BuilderRowDraft {
  return {
    columnWidths: options.columns ?? [100],
    contentWidth: options.contentWidth ?? "normal",
    backgroundColor: "",
    widgets,
  };
}

function placesFromFacts(facts: InspiredCopyFacts): string[] {
  const seen = new Set<string>();
  const places: string[] = [];
  for (const place of [...(facts.locations ?? []), ...(facts.serviceAreas ?? [])]) {
    const value = place.replace(/\s+/g, " ").trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    places.push(value);
  }
  return places;
}

function listPhrase(values: string[]): string {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function hrefFor(orgSlug: string, slug = ""): string {
  return builderPagePath(orgSlug, slug);
}

function closeWithContact(copy: InspiredCopy, orgSlug: string, rows: BuilderRowDraft[]) {
  const button = copy.buttonLabel || "Get in touch";
  rows.push(
    band(
      [
        widget("cta", 0, {
          heading: copy.ctaHeading,
          body: copy.ctaBody,
          buttonLabel: button,
          buttonHref: hrefFor(orgSlug, OWNED_CONTACT_SLUG),
          headingLevel: "h2",
        }),
      ],
      { contentWidth: "normal" },
    ),
  );
  return rows;
}

function closeWithForm(copy: InspiredCopy, rows: BuilderRowDraft[]) {
  const button = copy.buttonLabel || "Get in touch";
  rows.push(
    band(
      [
        widget("cta", 0, {
          heading: copy.ctaHeading,
          body: copy.ctaBody,
          buttonLabel: button,
          buttonHref: "#lead",
          headingLevel: "h2",
        }),
      ],
      { contentWidth: "normal" },
    ),
  );
  rows.push(
    band(
      [
        widget("lead", 0, {
          heading: copy.leadHeading,
          headingLevel: "h2",
          body: copy.leadBody,
        }),
      ],
      { contentWidth: "narrow" },
    ),
  );
  return rows;
}

export function ownedChromeFooter(businessName: string): string {
  const name = businessName.replace(/\s+/g, " ").trim() || "This business";
  return clip(`${name}. Get in touch on this GroovGro website.`, 200);
}

export function ownedHomeMeta(copy: InspiredCopy): string {
  return clip(copy.heroSubheading || copy.introBody, 160);
}

export function readBrandContact(
  contact: Record<string, string> | null | undefined,
): { email: string; phone: string; address: string } {
  const raw = contact ?? {};
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const direct = raw[key];
      if (typeof direct === "string" && direct.trim()) return direct.trim();
      const match = Object.entries(raw).find(
        ([name, value]) => name.toLowerCase() === key.toLowerCase() && typeof value === "string" && value.trim(),
      );
      if (match && typeof match[1] === "string") return match[1].trim();
    }
    return "";
  };
  return {
    email: pick("email", "mail"),
    phone: pick("phone", "tel", "telephone"),
    address: pick("address", "street", "location"),
  };
}

export function readBrandSocialLinks(
  profiles: Record<string, string> | null | undefined,
): { label: string; url: string }[] {
  const links: { label: string; url: string }[] = [];
  const seen = new Set<string>();
  for (const [label, url] of Object.entries(profiles ?? {})) {
    const name = label.replace(/\s+/g, " ").trim();
    const href = url.trim();
    if (!name || !href || seen.has(href)) continue;
    if (!href.startsWith("https://") || !isSafeBuilderHref(href)) continue;
    seen.add(href);
    links.push({ label: name.slice(0, 40), url: href.slice(0, 500) });
    if (links.length >= 6) break;
  }
  return links;
}

export function completeOwnedCopyFacts(facts: InspiredCopyFacts): InspiredCopyFacts {
  const topics: string[] = [];
  const seen = new Set<string>();
  function add(topic: string) {
    const value = topic.replace(/\s+/g, " ").trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) return;
    seen.add(key);
    topics.push(value);
  }

  for (const topic of facts.topics) add(topic);
  for (const offer of facts.offers) add(offer.name);
  for (const topic of FALLBACK_TOPICS) {
    if (topics.length >= 3) break;
    add(topic);
  }

  const questions: string[] = [];
  const questionSeen = new Set<string>();
  function addQuestion(question: string) {
    const value = question.replace(/\s+/g, " ").trim();
    const key = value.toLowerCase();
    if (!value || questionSeen.has(key)) return;
    questionSeen.add(key);
    questions.push(value);
  }
  for (const question of facts.questions) addQuestion(question);
  addQuestion("How do I get started?");
  addQuestion("How do I get in touch?");
  if (facts.targetCustomers.trim()) addQuestion("Who do you work with?");
  if (placesFromFacts(facts).length > 0) addQuestion("Where do you work?");
  if (facts.offers.some((offer) => offer.name.trim())) addQuestion("What can I ask about?");

  return {
    ...facts,
    topics: topics.slice(0, 6),
    questions: questions.slice(0, 6),
  };
}

function offerSlug(name: string, taken: Set<string>): string | null {
  const base = suggestPageSlug(name);
  if (!base) return null;
  const candidates = [base, `${base}-offer`, ...Array.from({ length: 8 }, (_, index) => `${base}-${index + 2}`)];
  for (const slug of candidates) {
    if (OWNED_CORE_SLUGS.has(slug) || isArchivedHomeSlug(slug)) continue;
    if (["home", "app", "api", "w", "www", "preview", "admin", "login", "signup", "website-builder"].includes(slug)) {
      continue;
    }
    if (taken.has(slug)) continue;
    return slug;
  }
  return null;
}

export function ownedOfferPagePlans(
  offers: InspiredOfferInput[],
  takenSlugs: string[] = [],
): { offer: InspiredOfferInput; slug: string }[] {
  const taken = new Set(takenSlugs.filter(Boolean));
  const plans: { offer: InspiredOfferInput; slug: string }[] = [];
  for (const offer of offers) {
    if (plans.length >= MAX_OWNED_OFFER_PAGES) break;
    const name = offer.name.replace(/\s+/g, " ").trim();
    if (!name) continue;
    const slug = offerSlug(name, taken);
    if (!slug) continue;
    taken.add(slug);
    plans.push({ offer: { ...offer, name }, slug });
  }
  return plans;
}

export function draftAboutPageRows(copy: InspiredCopy, orgSlug: string): BuilderRowDraft[] {
  const button = copy.buttonLabel || "Get in touch";
  return closeWithContact(copy, orgSlug, [
    band(
      [
        widget("hero", 0, {
          heading: copy.aboutHeading,
          subheading: copy.aboutBody,
          buttonLabel: button,
          buttonHref: hrefFor(orgSlug, OWNED_CONTACT_SLUG),
          headingLevel: "h1",
        }),
      ],
      { contentWidth: "full" },
    ),
    band(
      [
        widget("text", 0, {
          heading: copy.introHeading,
          body: copy.introBody,
          headingLevel: "h2",
        }),
      ],
      { contentWidth: "narrow" },
    ),
  ]);
}

export function draftWorkPageRows(
  copy: InspiredCopy,
  orgSlug: string,
  offers: { offer: InspiredOfferInput; slug: string }[] = [],
): BuilderRowDraft[] {
  const button = copy.buttonLabel || "Get in touch";
  const rows: BuilderRowDraft[] = [
    band(
      [
        widget("hero", 0, {
          heading: copy.featuresHeading,
          subheading: copy.heroSubheading,
          buttonLabel: button,
          buttonHref: hrefFor(orgSlug, OWNED_CONTACT_SLUG),
          headingLevel: "h1",
        }),
      ],
      { contentWidth: "full" },
    ),
  ];
  if (copy.featureItems.length > 0) {
    rows.push(
      band(
        [
          widget("features", 0, {
            heading: copy.featuresHeading,
            headingLevel: "h2",
            items: copy.featureItems.join("\n"),
          }),
        ],
        { contentWidth: "wide" },
      ),
    );
  }
  if (offers.length > 0) {
    rows.push(
      band(
        offers.slice(0, 3).map((item, index) =>
          widget("text", index, {
            heading: item.offer.name,
            body: clip(item.offer.description || copy.heroSubheading, 220),
            headingLevel: "h3",
            linkLabel: "Read more",
            linkHref: hrefFor(orgSlug, item.slug),
          }),
        ),
        { columns: offers.length === 1 ? [100] : offers.length === 2 ? [50, 50] : [34, 33, 33], contentWidth: "wide" },
      ),
    );
  }
  return closeWithContact(copy, orgSlug, rows);
}

export function draftContactPageRows(copy: InspiredCopy, facts: InspiredCopyFacts): BuilderRowDraft[] {
  const name = facts.businessName.trim() || "this business";
  const places = placesFromFacts(facts);
  const emailRaw = facts.contactEmail?.trim() ?? "";
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw) ? emailRaw.slice(0, 120) : "";
  const phone = facts.contactPhone?.trim() ?? "";
  const address = facts.contactAddress?.trim() || places[0] || "";
  const hours = facts.operatingHours?.replace(/\s+/g, " ").trim() ?? "";
  const contactLines = [
    `Use the form on this page and someone from ${name} will follow up.`,
    email ? `Email: ${email}` : "",
    phone ? `Phone: ${phone}` : "",
    address ? `Place: ${address}` : "",
  ].filter(Boolean);

  const rows: BuilderRowDraft[] = [
    band(
      [
        widget("hero", 0, {
          heading: "Get in touch",
          subheading: clip(`Tell ${name} what you need. A person from the business replies.`, 220),
          buttonLabel: copy.buttonLabel || "Get in touch",
          buttonHref: "#lead",
          headingLevel: "h1",
        }),
      ],
      { contentWidth: "full" },
    ),
    band(
      [
        widget("contact", 0, {
          heading: "How to reach us",
          headingLevel: "h2",
          body: clip(contactLines.join("\n"), 400),
          buttonLabel: email ? "Email us" : copy.buttonLabel || "Get in touch",
          buttonHref: email ? `mailto:${email}` : "#lead",
        }),
      ],
      { contentWidth: "narrow" },
    ),
  ];

  if (phone && builderTelHref(phone)) {
    rows.push(
      band(
        [
          widget("call", 0, {
            heading: "Call or message",
            headingLevel: "h2",
            body: clip(`A person from ${name} answers.`, 200),
            buttonLabel: "Call",
            phone,
          }),
        ],
        { contentWidth: "narrow" },
      ),
    );
  }

  if (hours) {
    rows.push(
      band(
        [
          widget("hours", 0, {
            heading: "Hours",
            headingLevel: "h2",
            items: `Hours | ${clip(hours, 160)}`,
          }),
        ],
        { contentWidth: "narrow" },
      ),
    );
  }

  if (address) {
    rows.push(
      band(
        [
          widget("map", 0, {
            heading: "Find us",
            headingLevel: "h2",
            body: clip(address, 200),
            mapQuery: clip(address, 200),
          }),
        ],
        { contentWidth: "wide" },
      ),
    );
  }

  const socialItems = (facts.socialLinks ?? [])
    .map((link) => `${link.label} | ${link.url}`)
    .join("\n");
  if (socialItems) {
    rows.push(
      band(
        [
          widget("social", 0, {
            heading: "Follow along",
            headingLevel: "h2",
            items: socialItems,
          }),
        ],
        { contentWidth: "narrow" },
      ),
    );
  }

  return closeWithForm(copy, rows);
}

export function draftFaqPageRows(copy: InspiredCopy, orgSlug: string): BuilderRowDraft[] {
  return closeWithContact(copy, orgSlug, [
    band(
      [
        widget("hero", 0, {
          heading: "Questions people ask",
          subheading: copy.heroSubheading,
          buttonLabel: copy.buttonLabel || "Get in touch",
          buttonHref: hrefFor(orgSlug, OWNED_CONTACT_SLUG),
          headingLevel: "h1",
        }),
      ],
      { contentWidth: "full" },
    ),
    band(
      [
        widget("faq", 0, {
          heading: "Questions people ask",
          headingLevel: "h2",
          items: copy.faqItems.join("\n"),
        }),
      ],
      { contentWidth: "normal" },
    ),
  ]);
}

export function draftAreasPageRows(
  copy: InspiredCopy,
  facts: InspiredCopyFacts,
  orgSlug: string,
): BuilderRowDraft[] {
  const places = placesFromFacts(facts);
  const rows: BuilderRowDraft[] = [
    band(
      [
        widget("hero", 0, {
          heading: "Where we work",
          subheading: clip(
            places.length > 0
              ? `${facts.businessName.trim() || "This business"} works in ${listPhrase(places)}.`
              : copy.heroSubheading,
            220,
          ),
          buttonLabel: copy.buttonLabel || "Get in touch",
          buttonHref: hrefFor(orgSlug, OWNED_CONTACT_SLUG),
          headingLevel: "h1",
        }),
      ],
      { contentWidth: "full" },
    ),
  ];
  if (places.length > 0) {
    rows.push(
      band(
        places.slice(0, 3).map((place, index) =>
          widget("text", index, {
            heading: place,
            body: clip(`Ask ${facts.businessName.trim() || "us"} about work in ${place}.`, 220),
            headingLevel: "h3",
            linkLabel: copy.buttonLabel || "Get in touch",
            linkHref: hrefFor(orgSlug, OWNED_CONTACT_SLUG),
          }),
        ),
        {
          columns: places.length === 1 ? [100] : places.length === 2 ? [50, 50] : [34, 33, 33],
          contentWidth: "wide",
        },
      ),
    );
    rows.push(
      band(
        [
          widget("map", 0, {
            heading: "Find us",
            headingLevel: "h2",
            body: clip(places[0] ?? "", 200),
            mapQuery: clip(places[0] ?? "", 200),
          }),
        ],
        { contentWidth: "wide" },
      ),
    );
  }
  return closeWithContact(copy, orgSlug, rows);
}

export function draftOfferPageRows(
  copy: InspiredCopy,
  offer: InspiredOfferInput,
  orgSlug: string,
): BuilderRowDraft[] {
  const name = offer.name.replace(/\s+/g, " ").trim();
  const body = clip(offer.description || copy.heroSubheading, 320);
  return closeWithContact(copy, orgSlug, [
    band(
      [
        widget("hero", 0, {
          heading: name,
          subheading: body,
          buttonLabel: copy.buttonLabel || "Get in touch",
          buttonHref: hrefFor(orgSlug, OWNED_CONTACT_SLUG),
          headingLevel: "h1",
        }),
      ],
      { contentWidth: "full" },
    ),
    band(
      [
        widget("text", 0, {
          heading: copy.aboutHeading,
          body: copy.aboutBody,
          headingLevel: "h2",
        }),
      ],
      { contentWidth: "narrow" },
    ),
  ]);
}

export function draftOwnedHomeRows(input: OwnedSiteInput): BuilderRowDraft[] {
  const { copy, facts, orgSlug } = input;
  const topics = facts.topics;
  const button = copy.buttonLabel || "Get in touch";
  const contactHref = hrefFor(orgSlug, OWNED_CONTACT_SLUG);
  const offers = ownedOfferPagePlans(facts.offers);
  const places = placesFromFacts(facts);
  const hours = facts.operatingHours?.replace(/\s+/g, " ").trim() ?? "";

  const rows: BuilderRowDraft[] = [
    band(
      [
        widget("hero", 0, {
          heading: copy.heroHeading,
          subheading: copy.heroSubheading,
          buttonLabel: button,
          buttonHref: "#lead",
          headingLevel: "h1",
        }),
      ],
      { contentWidth: "full" },
    ),
  ];

  if (copy.introBody) {
    rows.push(
      band(
        [
          widget("text", 0, {
            heading: copy.introHeading,
            body: copy.introBody,
            headingLevel: "h2",
            linkLabel: "About us",
            linkHref: hrefFor(orgSlug, OWNED_ABOUT_SLUG),
          }),
        ],
        { contentWidth: "narrow" },
      ),
    );
  }

  const pageCards = [
    {
      heading: "About us",
      body: clip(copy.aboutBody, 180),
      href: hrefFor(orgSlug, OWNED_ABOUT_SLUG),
      label: "Read about us",
    },
    {
      heading: copy.featuresHeading,
      body: clip(copy.featureItems[0]?.split(" | ")[1] || copy.heroSubheading, 180),
      href: hrefFor(orgSlug, OWNED_WORK_SLUG),
      label: "See what we offer",
    },
    {
      heading: "Get in touch",
      body: clip(copy.leadBody, 180),
      href: contactHref,
      label: button,
    },
  ];
  rows.push(
    band(
      pageCards.map((card, index) =>
        widget("text", index, {
          heading: card.heading,
          body: card.body,
          headingLevel: "h3",
          linkLabel: card.label,
          linkHref: card.href,
        }),
      ),
      { columns: [34, 33, 33], contentWidth: "wide" },
    ),
  );

  if (topics.length >= 3) {
    rows.push(
      band(
        topics.slice(0, 3).map((topic, index) =>
          widget("text", index, {
            heading: topic,
            body: copy.topicBodies[index] || copy.heroSubheading,
            headingLevel: "h3",
            linkLabel: button,
            linkHref: contactHref,
          }),
        ),
        { columns: [34, 33, 33], contentWidth: "wide" },
      ),
    );
  }

  if (copy.featureItems.length > 0) {
    rows.push(
      band(
        [
          widget("features", 0, {
            heading: copy.featuresHeading,
            headingLevel: "h2",
            items: copy.featureItems.join("\n"),
          }),
        ],
        { contentWidth: "wide" },
      ),
    );
  }

  if (offers.length > 0) {
    rows.push(
      band(
        offers.slice(0, 3).map((item, index) =>
          widget("text", index, {
            heading: item.offer.name,
            body: clip(item.offer.description || copy.heroSubheading, 180),
            headingLevel: "h3",
            linkLabel: "Read more",
            linkHref: hrefFor(orgSlug, item.slug),
          }),
        ),
        { columns: offers.length === 1 ? [100] : offers.length === 2 ? [50, 50] : [34, 33, 33], contentWidth: "wide" },
      ),
    );
  }

  const name = facts.businessName.trim() || "this business";
  rows.push(
    band(
      [
        widget("features", 0, {
          heading: "How it works",
          headingLevel: "h2",
          items: [
            `Send a note | Use the form on this page. Someone from ${name} replies.`,
            "A person follows up | A person from the business writes back. This page does not charge a card.",
            "We plan the next step | Tell us what you need and we will talk through what happens next.",
          ].join("\n"),
        }),
      ],
      { contentWidth: "wide" },
    ),
  );

  rows.push(
    band(
      [
        widget("text", 0, {
          heading: copy.aboutHeading,
          body: copy.aboutBody,
          headingLevel: "h2",
          linkLabel: "Read the About page",
          linkHref: hrefFor(orgSlug, OWNED_ABOUT_SLUG),
        }),
      ],
      { contentWidth: "narrow" },
    ),
  );

  if (places.length > 0) {
    rows.push(
      band(
        [
          widget("text", 0, {
            heading: "Where we work",
            body: clip(`We work in ${listPhrase(places)}.`, 220),
            headingLevel: "h2",
            linkLabel: "See where we work",
            linkHref: hrefFor(orgSlug, OWNED_AREAS_SLUG),
          }),
        ],
        { contentWidth: "narrow" },
      ),
    );
  }

  if (hours) {
    rows.push(
      band(
        [
          widget("hours", 0, {
            heading: "Hours",
            headingLevel: "h2",
            items: `Hours | ${clip(hours, 160)}`,
          }),
        ],
        { contentWidth: "narrow" },
      ),
    );
  }

  if (copy.faqItems.length > 0) {
    rows.push(
      band(
        [
          widget("faq", 0, {
            heading: "Questions people ask",
            headingLevel: "h2",
            items: copy.faqItems.slice(0, 3).join("\n"),
          }),
        ],
        { contentWidth: "normal" },
      ),
    );
    rows.push(
      band(
        [
          widget("text", 0, {
            heading: "More questions",
            body: "Read the full list, then send a note if you still have one.",
            headingLevel: "h2",
            linkLabel: "See all questions",
            linkHref: hrefFor(orgSlug, OWNED_FAQ_SLUG),
          }),
        ],
        { contentWidth: "narrow" },
      ),
    );
  }

  return closeWithForm(copy, rows);
}

export function ownedExtraPages(input: OwnedSiteInput): OwnedPageDraft[] {
  const { copy, facts, orgSlug } = input;
  const offers = ownedOfferPagePlans(facts.offers);
  const places = placesFromFacts(facts);
  const pages: OwnedPageDraft[] = [
    {
      title: "About",
      slug: OWNED_ABOUT_SLUG,
      metaDescription: clip(copy.aboutBody, 160),
      rows: draftAboutPageRows(copy, orgSlug),
    },
    {
      title: "What we offer",
      slug: OWNED_WORK_SLUG,
      metaDescription: clip(copy.heroSubheading || copy.featuresHeading, 160),
      rows: draftWorkPageRows(copy, orgSlug, offers),
    },
  ];

  for (const item of offers) {
    pages.push({
      title: item.offer.name,
      slug: item.slug,
      metaDescription: clip(item.offer.description || copy.heroSubheading, 160),
      rows: draftOfferPageRows(copy, item.offer, orgSlug),
    });
  }

  if (places.length > 0) {
    pages.push({
      title: "Where we work",
      slug: OWNED_AREAS_SLUG,
      metaDescription: clip(`Where ${facts.businessName.trim() || "we"} work.`, 160),
      rows: draftAreasPageRows(copy, facts, orgSlug),
    });
  }

  pages.push({
    title: "Questions",
    slug: OWNED_FAQ_SLUG,
    metaDescription: clip(`Questions people ask ${facts.businessName.trim() || "this business"}.`, 160),
    rows: draftFaqPageRows(copy, orgSlug),
  });
  pages.push({
    title: "Contact",
    slug: OWNED_CONTACT_SLUG,
    metaDescription: clip(`Get in touch with ${facts.businessName.trim() || "this business"}.`, 160),
    rows: draftContactPageRows(copy, facts),
  });

  return pages;
}
