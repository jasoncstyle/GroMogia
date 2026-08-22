import { parseHeadingLevel } from "@/lib/website-builder/style";
import { scoreFindings, type SeoFinding } from "@/lib/seo/audit";

export type BuilderSeoSnapshot = {
  pageLabel: string
  title: string
  metaDescription: string
  published: boolean
  publicUrl: string
  headings: { level: "h1" | "h2" | "h3" | "p"; text: string }[]
  images: { alt: string }[]
};

export type BuilderSeoWidget = {
  type: string
  content: {
    heading?: string
    headingLevel?: string
    imageUrl?: string
    imageAlt?: string
  }
};

export function snapshotBuilderPage(input: {
  pageLabel: string
  title: string
  metaDescription: string
  published: boolean
  publicUrl: string
  widgets: BuilderSeoWidget[]
}): BuilderSeoSnapshot {
  const headings = input.widgets.flatMap((widget) => {
    const text = widget.content.heading?.replace(/\s+/g, " ").trim() ?? "";
    if (!text) return [];
    const fallback = widget.type === "hero" ? "h1" : "h2";
    return [
      {
        level: parseHeadingLevel(widget.content.headingLevel, fallback),
        text,
      },
    ];
  });
  const images = input.widgets.flatMap((widget) => {
    const url = widget.content.imageUrl?.trim() ?? "";
    if (!url) return [];
    return [{ alt: widget.content.imageAlt?.replace(/\s+/g, " ").trim() ?? "" }];
  });
  return {
    pageLabel: input.pageLabel,
    title: input.title.replace(/\s+/g, " ").trim(),
    metaDescription: input.metaDescription.replace(/\s+/g, " ").trim(),
    published: input.published,
    publicUrl: input.publicUrl,
    headings,
    images,
  };
}

export function auditBuilderPage(input: BuilderSeoSnapshot): {
  findings: SeoFinding[]
  score: number
  summary: string
} {
  const findings: SeoFinding[] = [];
  const page = input.pageLabel;

  if (input.title) {
    const length = input.title.length;
    findings.push({
      id: "title",
      severity: length < 10 || length > 65 ? "warn" : "ok",
      title: "Page title",
      detail: `“${input.title}” (${length} characters).`,
      recommendation:
        length < 10 || length > 65
          ? `In Website builder, open ${page} and set a Page title around 50–60 characters.`
          : `Keep the ${page} title specific.`,
    });
  } else {
    findings.push({
      id: "title",
      severity: "fail",
      title: "Page title",
      detail: `${page} has no page title.`,
      recommendation: `Open Website builder, edit ${page}, and add a Page title.`,
    });
  }

  if (input.metaDescription) {
    const length = input.metaDescription.length;
    findings.push({
      id: "description",
      severity: length < 50 || length > 170 ? "warn" : "ok",
      title: "Meta description",
      detail: `${length} characters.`,
      recommendation:
        length < 50 || length > 170
          ? `On ${page}, write a Search description of about 120–160 characters.`
          : `The ${page} search description is in a usable range.`,
    });
  } else {
    findings.push({
      id: "description",
      severity: "fail",
      title: "Meta description",
      detail: `${page} has no search description.`,
      recommendation: `Open Website builder, edit ${page}, and add a Search description.`,
    });
  }

  const h1Count = input.headings.filter((heading) => heading.level === "h1").length;
  findings.push({
    id: "h1",
    severity: h1Count === 1 ? "ok" : "warn",
    title: "Main heading",
    detail:
      h1Count === 0
        ? `No Heading 1 was found on ${page}.`
        : `${h1Count} Heading 1${h1Count === 1 ? "" : "s"} on ${page}.`,
    recommendation:
      h1Count === 1
        ? "One main heading is the usual pattern."
        : `On ${page}, use one Heading 1 that matches what the page is about. Change extra headings to Heading 2 or 3.`,
  });

  const missingAlt = input.images.filter((image) => !image.alt).length;
  findings.push({
    id: "alt",
    severity: missingAlt > 0 ? "warn" : "ok",
    title: "Image text",
    detail:
      input.images.length === 0
        ? `No photos are on ${page} yet.`
        : `${missingAlt} of ${input.images.length} photos on ${page} are missing alt text.`,
    recommendation:
      missingAlt > 0
        ? `Open the photo widget on ${page} and add a short Image text that describes the picture.`
        : `Photo text on ${page} looks complete.`,
  });

  if (input.published) {
    findings.push({
      id: "live",
      severity: "ok",
      title: "Live page",
      detail: `Published at ${input.publicUrl}.`,
      recommendation: "Search tools can see this GroovGro page.",
    });
    findings.push({
      id: "auto-head",
      severity: "ok",
      title: "Page tags",
      detail:
        "Language, viewport, canonical, share preview, and structured data are added when this GroovGro page is live.",
      recommendation:
        "You do not add those tags by hand on a GroovGro page. robots.txt and sitemap stay on the connected website origin, not on groovgro.com.",
    });
  } else {
    findings.push({
      id: "live",
      severity: "warn",
      title: "Live page",
      detail: `${page} is still a draft.`,
      recommendation: `Publish ${page} in Website builder when you want search tools to see it.`,
    });
    findings.push({
      id: "auto-head",
      severity: "warn",
      title: "Page tags",
      detail:
        "Language, viewport, canonical, share preview, and structured data appear after you publish this GroovGro page.",
      recommendation: `Publish ${page} when it is ready. GroovGro will not write robots.txt or sitemap.xml on groovgro.com.`,
    });
  }

  const score = scoreFindings(findings);
  const fails = findings.filter((item) => item.severity === "fail").length;
  const warns = findings.filter((item) => item.severity === "warn").length;
  const summary =
    fails > 0
      ? `${page} has ${fails} issue${fails === 1 ? "" : "s"} to fix first, and ${warns} item${warns === 1 ? "" : "s"} to review. GroovGro did not change the connected website.`
      : warns > 0
        ? `${page} has no blocking issues. ${warns} item${warns === 1 ? "" : "s"} could be clearer. GroovGro did not change the connected website.`
        : `${page} looks complete for a first GroovGro check. GroovGro did not change the connected website.`;

  return { findings, score, summary };
}
