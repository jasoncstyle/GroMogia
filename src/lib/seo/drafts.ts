import type { SeoFinding } from "@/lib/seo/audit";
import { isSafePublicHttpUrl } from "@/lib/seo/audit";

export type SeoDraftInput = {
  pageUrl: string
  businessName: string
  description: string
  tone: string
  doSay: string
  dontSay: string
  target?: "connected" | "builder"
  pageLabel?: string
};

export type SeoChangeDraft = {
  findingId: string
  title: string
  proposedChange: string
  howToApply: string
};

const APPLY_NOTE =
  "Copy this onto the connected website yourself. GroovGro will not update the live site, even if you approve the draft.";

const SKIP_ON_BUILDER = new Set([
  "lang",
  "viewport",
  "canonical",
  "share",
  "structured-data",
  "robots-file",
  "sitemap",
  "robots-meta",
  "auto-head",
]);

export function buildSeoChangeDrafts(
  findings: SeoFinding[],
  input: SeoDraftInput,
): SeoChangeDraft[] {
  const pageUrl = isSafePublicHttpUrl(input.pageUrl);
  const href = pageUrl ? pageUrl.toString() : input.pageUrl;
  const origin = pageUrl ? `${pageUrl.protocol}//${pageUrl.host}` : href;
  const name = input.businessName.trim() || "this business";
  const offer = firstSentence(input.description) || input.doSay.trim() || name;
  const drafts: SeoChangeDraft[] = [];

  for (const finding of findings) {
    if (finding.severity === "ok") continue;
    const draft = draftForFinding(finding, {
      href,
      origin,
      name,
      offer,
      tone: input.tone,
      doSay: input.doSay,
      dontSay: input.dontSay,
      target: input.target === "builder" ? "builder" : "connected",
      pageLabel: input.pageLabel?.trim() || "this page",
    });
    if (draft) drafts.push(draft);
  }
  return drafts;
}

function draftForFinding(
  finding: SeoFinding,
  ctx: {
    href: string
    origin: string
    name: string
    offer: string
    tone: string
    doSay: string
    dontSay: string
    target: "connected" | "builder"
    pageLabel: string
  },
): SeoChangeDraft | null {
  const page = ctx.pageLabel;
  if (ctx.target === "builder" && SKIP_ON_BUILDER.has(finding.id)) {
    return null;
  }
  switch (finding.id) {
    case "title":
      return {
        findingId: finding.id,
        title: "Page title",
        proposedChange: clip(`${ctx.name} | ${ctx.offer}`, 60),
        howToApply:
          ctx.target === "builder"
            ? `Open Website builder, edit ${page}, change Page title, and click Save details.`
            : `Replace the homepage <title> on the connected site.\n${APPLY_NOTE}`,
      };
    case "description":
      return {
        findingId: finding.id,
        title: "Meta description",
        proposedChange: clip(
          voiceSafe([ctx.offer, ctx.doSay].filter(Boolean).join(" "), ctx.dontSay),
          160,
        ),
        howToApply:
          ctx.target === "builder"
            ? `Open Website builder, edit ${page}, change Search description, and click Save details.`
            : `Set the homepage meta description on the connected site.\n${APPLY_NOTE}`,
      };
    case "h1":
      return {
        findingId: finding.id,
        title: "Main heading",
        proposedChange: clip(ctx.offer, 80),
        howToApply:
          ctx.target === "builder"
            ? `On ${page}, keep one Heading 1. Change extra headings to Heading 2 or 3.`
            : `Use one H1 on the homepage.\n${APPLY_NOTE}`,
      };
    case "live":
      return ctx.target === "builder"
        ? {
            findingId: finding.id,
            title: "Live page",
            proposedChange: `Publish ${page} in Website builder when this page should appear in search.`,
            howToApply: `Open Website builder, edit ${page}, and click Publish. GroovGro will not change the connected existing website.`,
          }
        : null;
    case "alt":
      return {
        findingId: finding.id,
        title: "Image text",
        proposedChange:
          "Add a short alt attribute on each meaningful image, describing what the picture shows.",
        howToApply:
          ctx.target === "builder"
            ? `Open the photo widget on ${page} and fill in Image text.`
            : `Edit image alt text on the connected website.\n${APPLY_NOTE}`,
      };
    case "lang":
      return {
        findingId: finding.id,
        title: "Page language",
        proposedChange: `<html lang="en">`,
        howToApply: `Add lang on the html tag.\n${APPLY_NOTE}`,
      };
    case "viewport":
      return {
        findingId: finding.id,
        title: "Mobile viewport",
        proposedChange: `<meta name="viewport" content="width=device-width, initial-scale=1" />`,
        howToApply: `Add this tag in the homepage <head>.\n${APPLY_NOTE}`,
      };
    case "canonical":
      return {
        findingId: finding.id,
        title: "Canonical URL",
        proposedChange: `<link rel="canonical" href="${escapeAttr(ctx.href)}" />`,
        howToApply: `Add this tag in the homepage <head> so search tools know the main address.\n${APPLY_NOTE}`,
      };
    case "share":
      return {
        findingId: finding.id,
        title: "Share preview",
        proposedChange: [
          `<meta property="og:title" content="${escapeAttr(ctx.name)}" />`,
          `<meta property="og:description" content="${escapeAttr(clip(ctx.offer, 160))}" />`,
          `<meta property="og:url" content="${escapeAttr(ctx.href)}" />`,
        ].join("\n"),
        howToApply: `Add Open Graph tags in the homepage <head>.\n${APPLY_NOTE}`,
      };
    case "structured-data":
      return {
        findingId: finding.id,
        title: "Structured data",
        proposedChange: JSON.stringify(
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: ctx.name,
            url: ctx.href,
          },
          null,
          2,
        ),
        howToApply: `Add this JSON-LD in a script type="application/ld+json" on the homepage. Do not invent an address.\n${APPLY_NOTE}`,
      };
    case "robots-file":
      return {
        findingId: finding.id,
        title: "robots.txt",
        proposedChange: [
          "User-agent: *",
          "Allow: /",
          `Sitemap: ${ctx.origin}/sitemap.xml`,
        ].join("\n"),
        howToApply: `Publish this as robots.txt at the website origin. Do not Disallow the whole site unless you mean to hide it.\n${APPLY_NOTE}`,
      };
    case "sitemap":
      return {
        findingId: finding.id,
        title: "Sitemap",
        proposedChange: [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          `  <url><loc>${escapeXml(ctx.href)}</loc></url>`,
          `</urlset>`,
        ].join("\n"),
        howToApply: `Publish this as sitemap.xml at the website origin, then add more public page URLs over time.\n${APPLY_NOTE}`,
      };
    case "robots-meta":
      return {
        findingId: finding.id,
        title: "Indexing",
        proposedChange: "Remove noindex from the homepage robots meta tag if this page should appear in search.",
        howToApply: `Edit the robots meta tag on the connected homepage.\n${APPLY_NOTE}`,
      };
    default:
      return null;
  }
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

function voiceSafe(value: string, dontSay: string): string {
  let next = value;
  for (const phrase of dontSay.split(/[.,;\n]/).map((part) => part.trim()).filter(Boolean)) {
    const pattern = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig");
    next = next.replace(pattern, "").replace(/\s+/g, " ").trim();
  }
  return next;
}

function escapeAttr(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
