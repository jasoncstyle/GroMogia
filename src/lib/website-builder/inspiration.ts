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
import {
  draftInspiredCopy,
  type InspiredCopy,
  type InspiredCopyFacts,
  type InspiredOfferInput,
} from "@/lib/website-builder/inspired-copy";

export const INSPIRED_TEMPLATE_ID = "inspired";

export const MAX_LAYOUT_URLS = 3;
export const MAX_COPY_URLS = 5;

export type InspiredDraftInput = {
  businessName: string
  description: string
  targetCustomers: string
  businessType: string
  locations?: string[]
  serviceAreas?: string[]
  notes?: string
  inferredSummary?: string
  offers?: InspiredOfferInput[]
  layoutPages: WebsitePageExtract[]
  copyPages: WebsitePageExtract[]
  copy?: InspiredCopy
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

export type InspirationFormFields = {
  businessType: string
  layoutUrl1: string
  layoutUrl2: string
  layoutUrl3: string
  copyUrl1: string
  copyUrl2: string
  copyUrl3: string
  copyUrl4: string
  copyUrl5: string
};

export function emptyInspirationFields(businessType = ""): InspirationFormFields {
  return {
    businessType,
    layoutUrl1: "",
    layoutUrl2: "",
    layoutUrl3: "",
    copyUrl1: "",
    copyUrl2: "",
    copyUrl3: "",
    copyUrl4: "",
    copyUrl5: "",
  };
}

function clipField(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function parseInspirationFormFields(input: unknown): InspirationFormFields {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const parsed = emptyInspirationFields(clipField(raw.businessType, 80));
  parsed.layoutUrl1 = clipField(raw.layoutUrl1, 500);
  parsed.layoutUrl2 = clipField(raw.layoutUrl2, 500);
  parsed.layoutUrl3 = clipField(raw.layoutUrl3, 500);
  parsed.copyUrl1 = clipField(raw.copyUrl1, 500);
  parsed.copyUrl2 = clipField(raw.copyUrl2, 500);
  parsed.copyUrl3 = clipField(raw.copyUrl3, 500);
  parsed.copyUrl4 = clipField(raw.copyUrl4, 500);
  parsed.copyUrl5 = clipField(raw.copyUrl5, 500);
  return parsed;
}

export function inspirationFieldsFromFormData(formData: FormData): InspirationFormFields {
  return parseInspirationFormFields({
    businessType: formData.get("businessType"),
    layoutUrl1: formData.get("layoutUrl1"),
    layoutUrl2: formData.get("layoutUrl2"),
    layoutUrl3: formData.get("layoutUrl3"),
    copyUrl1: formData.get("copyUrl1"),
    copyUrl2: formData.get("copyUrl2"),
    copyUrl3: formData.get("copyUrl3"),
    copyUrl4: formData.get("copyUrl4"),
    copyUrl5: formData.get("copyUrl5"),
  });
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

export function inspiredCopyFacts(input: InspiredDraftInput): InspiredCopyFacts {
  const researchPages = [...input.copyPages, ...input.layoutPages];
  return {
    businessName: input.businessName,
    description: input.description,
    targetCustomers: input.targetCustomers,
    businessType: input.businessType,
    locations: input.locations ?? [],
    serviceAreas: input.serviceAreas ?? [],
    notes: input.notes ?? "",
    inferredSummary: input.inferredSummary ?? "",
    offers: input.offers ?? [],
    topics: inspirationTopics(researchPages),
    questions: inspirationQuestions(researchPages),
  };
}

export function draftInspiredRows(input: InspiredDraftInput): BuilderRowDraft[] {
  const facts = inspiredCopyFacts(input);
  const copy = input.copy ?? draftInspiredCopy(facts);
  const topics = facts.topics;
  const button = copy.buttonLabel || "Get in touch";

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
            body: copy.topicBodies[index] || copy.heroSubheading,
            headingLevel: "h3",
            linkLabel: button,
            linkHref: "#lead",
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

  rows.push(
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
  );

  if (copy.faqItems.length > 0) {
    rows.push(
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
    );
  }

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

export function inspiredTheme() {
  return { ...DEFAULT_BUILDER_THEME };
}
