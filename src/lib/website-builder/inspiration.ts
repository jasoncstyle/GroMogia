import { isSafePublicHttpUrl } from "@/lib/seo/audit";
import {
  extractWebsitePage,
  isGenericWebsiteLabel,
  looksLikeBrandTitle,
  type WebsitePageExtract,
} from "@/lib/growth/website-discover";
import type { FetchedText } from "@/lib/seo/fetch";
import type { BuilderRowDraft, BuilderWidgetDraft } from "@/lib/website-builder/row-templates";
import type { BuilderSectionContent, BuilderSectionType } from "@/lib/db/schema";
import type { RowContentWidth } from "@/lib/website-builder/layout";
import { DEFAULT_BUILDER_THEME } from "@/lib/website-builder/style";

export const INSPIRED_TEMPLATE_ID = "inspired";

export const MAX_LAYOUT_URLS = 3;
export const MAX_COPY_URLS = 5;

export type InspiredDraftInput = {
  businessName: string
  description: string
  targetCustomers: string
  businessType: string
  layoutPages: WebsitePageExtract[]
  copyPages: WebsitePageExtract[]
};

function clipTopic(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 60);
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

export function normalizeInspirationUrl(value: string): string | null {
  const raw = value.trim().replace(/^['"<\[]+|['">\]]+$/g, "").trim();
  if (!raw) return null;
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const parsed = isSafePublicHttpUrl(withProtocol);
  return parsed ? parsed.toString() : null;
}

export function parseInspirationUrls(values: string[], limit: number): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const url = normalizeInspirationUrl(value);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    found.push(url);
    if (found.length >= limit) break;
  }
  return found;
}

export function inspirationPageFromUrl(url: string): WebsitePageExtract {
  let label = url.slice(0, 60);
  let isHome = true;
  try {
    const parsed = new URL(url);
    label = parsed.hostname.replace(/^www\./i, "");
    isHome = parsed.pathname === "/" || parsed.pathname === "";
  } catch {
    isHome = false;
  }
  return {
    url,
    title: label,
    description: "",
    headings: [label],
    navLabels: [],
    source: "connected_website",
    isHome,
  };
}

export async function loadInspirationPages(
  urls: string[],
  fetchText: (url: string) => Promise<FetchedText>,
): Promise<{ pages: WebsitePageExtract[]; failedUrls: string[] }> {
  const results = await Promise.all(
    urls.map(async (url) => {
      const fetched = await fetchText(url);
      if (!fetched.ok || !fetched.body) {
        return { url, page: null };
      }
      return {
        url,
        page: extractWebsitePage(url, fetched.body, "connected_website"),
      };
    }),
  );
  return {
    pages: results.flatMap((result) => (result.page ? [result.page] : [])),
    failedUrls: results.filter((result) => !result.page).map((result) => result.url),
  };
}

export function mergeInspirationPages(
  loaded: { pages: WebsitePageExtract[]; failedUrls: string[] },
): WebsitePageExtract[] {
  return [...loaded.pages, ...loaded.failedUrls.map(inspirationPageFromUrl)];
}

export function inspirationTopics(pages: WebsitePageExtract[], limit = 6): string[] {
  const topics: string[] = [];
  const seen = new Set<string>();
  for (const page of pages) {
    for (const heading of page.headings) {
      const topic = clipTopic(heading);
      const key = topic.toLowerCase();
      if (!topic || topic.length < 3) continue;
      if (isGenericWebsiteLabel(topic) || looksLikeBrandTitle(topic)) continue;
      if (/\?$/.test(topic)) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      topics.push(topic);
      if (topics.length >= limit) return topics;
    }
  }
  return topics;
}

export function inspirationQuestions(pages: WebsitePageExtract[], limit = 4): string[] {
  const questions: string[] = [];
  const seen = new Set<string>();
  for (const page of pages) {
    for (const heading of page.headings) {
      const topic = clipTopic(heading);
      if (!/\?$/.test(topic)) continue;
      const key = topic.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      questions.push(topic);
      if (questions.length >= limit) return questions;
    }
  }
  return questions;
}

export function draftInspiredRows(input: InspiredDraftInput): BuilderRowDraft[] {
  const name = input.businessName.trim() || "Your business";
  const businessType = input.businessType.trim();
  const offer =
    input.description.trim() ||
    (businessType
      ? `Tell people what this ${businessType} business does, in your own words.`
      : "Tell people what you do and how to get in touch.");
  const audience = input.targetCustomers.trim();
  const researchPages = [...input.copyPages, ...input.layoutPages];
  const topics = inspirationTopics(researchPages);
  const questions = inspirationQuestions(researchPages);
  const about = audience ? `${offer} We work with ${audience}.` : offer;

  const rows: BuilderRowDraft[] = [
    band(
      [
        widget("hero", 0, {
          heading: name,
          subheading: offer,
          buttonLabel: "Get in touch",
          buttonHref: "#lead",
          headingLevel: "h1",
        }),
      ],
      { contentWidth: "full" },
    ),
  ];

  if (businessType) {
    rows.push(
      band(
        [
          widget("text", 0, {
            heading: `A ${businessType} business`,
            body: "Use this line for who you help and what a first visit or job looks like. Write it in your words.",
            headingLevel: "h2",
          }),
        ],
        { contentWidth: "narrow" },
      ),
    );
  }

  if (topics.length >= 3) {
    rows.push(
      band(
        topics.slice(0, 3).map((topic, index) =>
          widget("text", index, {
            heading: topic,
            body: "Describe this in your own words. GroovGro used the heading as a starting label only.",
            headingLevel: "h3",
            linkLabel: "Get in touch",
            linkHref: "#lead",
          }),
        ),
        { columns: [34, 33, 33], contentWidth: "wide" },
      ),
    );
  }

  if (topics.length > 0) {
    rows.push(
      band(
        [
          widget("features", 0, {
            heading: "What people come for",
            headingLevel: "h2",
            items: topics
              .map((topic) => `${topic} | Write what this includes, in your words.`)
              .join("\n"),
          }),
        ],
        { contentWidth: "wide" },
      ),
    );
  }

  rows.push(
    band(
      [
        widget("text", 0, {
          heading: "About the work",
          body: about,
          headingLevel: "h2",
        }),
      ],
      { contentWidth: "narrow" },
    ),
  );

  if (questions.length > 0) {
    rows.push(
      band(
        [
          widget("faq", 0, {
            heading: "Questions people ask",
            headingLevel: "h2",
            items: questions
              .map((question) => `${question} | Write this answer in your own words.`)
              .join("\n"),
          }),
        ],
        { contentWidth: "normal" },
      ),
    );
  }

  rows.push(
    band(
      [
        widget("cta", 0, {
          heading: "Ready to talk?",
          body: "This draft used public pages you pasted for layout and topics. Edit every line. GroovGro did not copy another website.",
          buttonLabel: "Get in touch",
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
          heading: "Get in touch",
          headingLevel: "h2",
          body: "Share your name and email. This form is hosted by GroovGro.",
        }),
      ],
      { contentWidth: "narrow" },
    ),
  );

  return rows;
}

export function inspiredTheme() {
  return { ...DEFAULT_BUILDER_THEME };
}
