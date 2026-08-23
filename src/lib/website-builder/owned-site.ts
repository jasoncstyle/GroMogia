import type { BuilderSectionContent, BuilderSectionType } from "@/lib/db/schema";
import type { InspiredCopy, InspiredCopyFacts } from "@/lib/website-builder/inspired-copy";
import type { BuilderRowDraft, BuilderWidgetDraft } from "@/lib/website-builder/row-templates";
import type { RowContentWidth } from "@/lib/website-builder/layout";

export const OWNED_ABOUT_SLUG = "about";
export const OWNED_WORK_SLUG = "work";

const FALLBACK_TOPICS = ["What we do", "Who we help", "How it works"];
const FALLBACK_QUESTIONS = ["How do I get started?", "How do I get in touch?"];

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

  const questions = facts.questions.length > 0 ? facts.questions.slice(0, 4) : [...FALLBACK_QUESTIONS];
  return {
    ...facts,
    topics: topics.slice(0, 6),
    questions,
  };
}

export function draftAboutPageRows(copy: InspiredCopy): BuilderRowDraft[] {
  const button = copy.buttonLabel || "Get in touch";
  return closeWithForm(copy, [
    band(
      [
        widget("hero", 0, {
          heading: copy.aboutHeading,
          subheading: copy.aboutBody,
          buttonLabel: button,
          buttonHref: "#lead",
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

export function draftWorkPageRows(copy: InspiredCopy): BuilderRowDraft[] {
  const button = copy.buttonLabel || "Get in touch";
  const rows: BuilderRowDraft[] = [
    band(
      [
        widget("hero", 0, {
          heading: copy.featuresHeading,
          subheading: copy.heroSubheading,
          buttonLabel: button,
          buttonHref: "#lead",
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
  return closeWithForm(copy, rows);
}

export function ownedExtraPages(copy: InspiredCopy) {
  return [
    {
      title: "About",
      slug: OWNED_ABOUT_SLUG,
      rows: draftAboutPageRows(copy),
    },
    {
      title: "Work",
      slug: OWNED_WORK_SLUG,
      rows: draftWorkPageRows(copy),
    },
  ];
}
