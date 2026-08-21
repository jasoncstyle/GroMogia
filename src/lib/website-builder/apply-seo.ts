import type { BuilderSectionContent } from "@/lib/db/schema";

export const BUILDER_APPLYABLE_FINDING_IDS = ["title", "description", "h1"] as const;

export type BuilderApplyableFindingId =
  (typeof BUILDER_APPLYABLE_FINDING_IDS)[number];

export type BuilderApplyState = {
  title: string
  metaDescription: string
  sections: {
    id: string
    type: string
    content: BuilderSectionContent
  }[]
};

export type BuilderApplyResult = BuilderApplyState & {
  appliedTo: "title" | "metaDescription" | "heroHeading"
};

export function isBuilderApplyableFinding(
  findingId: string,
): findingId is BuilderApplyableFindingId {
  return (BUILDER_APPLYABLE_FINDING_IDS as readonly string[]).includes(findingId);
}

export function builderApplyHint(findingId: string): string {
  if (isBuilderApplyableFinding(findingId)) {
    return "After you Approve, you can click Apply to GroovGro website. That updates the GroovGro-hosted page only. It does not change the connected existing website.";
  }
  return "On a GroovGro-hosted page, language, viewport, canonical, share tags, and structured data are generated automatically. robots.txt and sitemap stay on the connected website origin. GroovGro will not change that live site.";
}

export function applyApprovedSeoDraftToBuilderState(
  state: BuilderApplyState,
  draft: { findingId: string; proposedChange: string },
): BuilderApplyResult {
  if (!isBuilderApplyableFinding(draft.findingId)) {
    throw new Error("This draft cannot be applied to the GroovGro website.");
  }

  const text = plainProposedText(draft.proposedChange);
  if (!text) {
    throw new Error("That draft has no text to apply.");
  }

  if (draft.findingId === "title") {
    return {
      ...state,
      title: clip(text, 120),
      appliedTo: "title",
    };
  }

  if (draft.findingId === "description") {
    return {
      ...state,
      metaDescription: clip(text, 160),
      appliedTo: "metaDescription",
    };
  }

  const heroIndex = state.sections.findIndex((section) => section.type === "hero");
  if (heroIndex < 0) {
    throw new Error("Add a hero section first, then apply the heading.");
  }

  const heading = clip(text, 120);
  const sections = state.sections.map((section, index) =>
    index === heroIndex
      ? { ...section, content: { ...section.content, heading } }
      : section,
  );

  return {
    ...state,
    sections,
    appliedTo: "heroHeading",
  };
}

export function builderPublicUrl(
  appOrigin: string,
  orgSlug: string,
  pageSlug = "",
): string {
  const origin = appOrigin.replace(/\/$/, "");
  const org = orgSlug.replace(/^\/+|\/+$/g, "");
  const slug = pageSlug.replace(/^\/+|\/+$/g, "");
  return slug ? `${origin}/w/${org}/${slug}` : `${origin}/w/${org}`;
}

export function publicBuilderPageSeo(input: {
  title: string
  metaDescription: string
  canonicalUrl: string
  businessName: string
  description: string
}) {
  const title =
    clip(input.title, 120) ||
    clip(input.businessName, 120) ||
    "Website";
  const description =
    clip(input.metaDescription, 160) ||
    clip(firstSentence(input.description), 160) ||
    title;
  const canonicalUrl = input.canonicalUrl.trim();

  return {
    title,
    description,
    canonicalUrl,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: clip(input.businessName, 120) || title,
      url: canonicalUrl,
    },
  };
}

function plainProposedText(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstSentence(value: string): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  const match = trimmed.match(/^[^.!?]+[.!?]?/);
  return (match?.[0] ?? trimmed).trim();
}

function clip(value: string, max: number): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}
