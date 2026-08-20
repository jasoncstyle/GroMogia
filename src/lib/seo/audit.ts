export type SeoFinding = {
  id: string
  severity: "ok" | "warn" | "fail"
  title: string
  detail: string
  recommendation: string
};

export type SeoAuditInput = {
  url: string
  html: string
  robotsText: string | null
  sitemapFound: boolean
};

function decode(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function attr(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i"));
  return match?.[1] ? decode(match[1]) : null;
}

function firstMatch(html: string, pattern: RegExp): string | null {
  const match = html.match(pattern);
  return match?.[1] ? decode(match[1]) : null;
}

export function auditConnectedPage(input: SeoAuditInput): {
  findings: SeoFinding[]
  score: number
  summary: string
} {
  const findings: SeoFinding[] = [];
  const html = input.html;
  const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const descriptionTag = metaTags.find((tag) =>
    /name\s*=\s*["']description["']/i.test(tag),
  );
  const description = descriptionTag ? attr(descriptionTag, "content") : null;
  const viewport = metaTags.some((tag) => /name\s*=\s*["']viewport["']/i.test(tag));
  const robotsMeta = metaTags.find((tag) => /name\s*=\s*["']robots["']/i.test(tag));
  const robotsContent = robotsMeta ? (attr(robotsMeta, "content") ?? "").toLowerCase() : "";
  const canonical = firstMatch(
    html,
    /<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*href\s*=\s*["']([^"']+)["'][^>]*>/i,
  ) ?? firstMatch(
    html,
    /<link\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*rel\s*=\s*["']canonical["'][^>]*>/i,
  );
  const ogTitle = metaTags.find((tag) => /property\s*=\s*["']og:title["']/i.test(tag));
  const h1Count = (html.match(/<h1\b/gi) ?? []).length;
  const htmlLang = firstMatch(html, /<html\b[^>]*lang\s*=\s*["']([^"']+)["']/i);
  const jsonLd = /application\/ld\+json/i.test(html);
  const images = html.match(/<img\b[^>]*>/gi) ?? [];
  const missingAlt = images.filter((tag) => {
    const alt = attr(tag, "alt");
    return alt === null;
  }).length;

  if (title) {
    const length = title.length;
    findings.push({
      id: "title",
      severity: length < 10 || length > 65 ? "warn" : "ok",
      title: "Page title",
      detail: `“${title}” (${length} characters).`,
      recommendation:
        length < 10 || length > 65
          ? "Aim for a clear title around 50–60 characters that names the business and what it offers."
          : "Keep the title specific. Change it on the connected website when you have a better one.",
    });
  } else {
    findings.push({
      id: "title",
      severity: "fail",
      title: "Page title",
      detail: "This page has no title tag.",
      recommendation:
        "Add a title tag on the connected website. GroovGro will not edit the site for you.",
    });
  }

  if (description) {
    const length = description.length;
    findings.push({
      id: "description",
      severity: length < 50 || length > 170 ? "warn" : "ok",
      title: "Meta description",
      detail: `${length} characters.`,
      recommendation:
        length < 50 || length > 170
          ? "Write one or two sentences (about 120–160 characters) that say what a visitor gets."
          : "The description is in a usable range.",
    });
  } else {
    findings.push({
      id: "description",
      severity: "fail",
      title: "Meta description",
      detail: "No meta description was found.",
      recommendation:
        "Add a meta description on the connected website so search results can show a short summary.",
    });
  }

  findings.push({
    id: "h1",
    severity: h1Count === 1 ? "ok" : "warn",
    title: "Main heading",
    detail:
      h1Count === 0
        ? "No H1 heading was found."
        : `${h1Count} H1 heading${h1Count === 1 ? "" : "s"} found.`,
    recommendation:
      h1Count === 1
        ? "One main heading is the usual pattern."
        : "Use one clear H1 that matches what the page is about.",
  });

  findings.push({
    id: "lang",
    severity: htmlLang ? "ok" : "warn",
    title: "Page language",
    detail: htmlLang ? `lang="${htmlLang}"` : "The html tag has no lang attribute.",
    recommendation: htmlLang
      ? "Language is marked."
      : "Add lang on the html tag (for example lang=\"en\") so browsers and search tools know the language.",
  });

  findings.push({
    id: "viewport",
    severity: viewport ? "ok" : "warn",
    title: "Mobile viewport",
    detail: viewport ? "A viewport meta tag is present." : "No viewport meta tag was found.",
    recommendation: viewport
      ? "Mobile scaling is declared."
      : "Add a viewport meta tag so phones can display the page correctly.",
  });

  findings.push({
    id: "canonical",
    severity: canonical ? "ok" : "warn",
    title: "Canonical URL",
    detail: canonical ? canonical : "No canonical link was found.",
    recommendation: canonical
      ? "A preferred URL is declared."
      : "Add a canonical URL so search tools know which address is the main one.",
  });

  if (/noindex/.test(robotsContent)) {
    findings.push({
      id: "robots-meta",
      severity: "fail",
      title: "Indexing",
      detail: `Robots meta is “${robotsContent}”.`,
      recommendation:
        "This page asks search tools not to index it. Remove noindex on the connected site if you want it in search results.",
    });
  } else {
    findings.push({
      id: "robots-meta",
      severity: "ok",
      title: "Indexing",
      detail: robotsContent
        ? `Robots meta is “${robotsContent}”.`
        : "No robots meta tag is blocking indexing.",
      recommendation: "The homepage is not asking to be hidden from search.",
    });
  }

  findings.push({
    id: "share",
    severity: ogTitle ? "ok" : "warn",
    title: "Share preview",
    detail: ogTitle
      ? "An Open Graph title is present."
      : "No og:title tag was found.",
    recommendation: ogTitle
      ? "Social shares have a title to use."
      : "Add Open Graph tags so Facebook and similar sites show a proper preview.",
  });

  findings.push({
    id: "structured-data",
    severity: jsonLd ? "ok" : "warn",
    title: "Structured data",
    detail: jsonLd
      ? "JSON-LD structured data is present."
      : "No JSON-LD structured data was found.",
    recommendation: jsonLd
      ? "Machine-readable business data is on the page."
      : "Later you can add structured data for a local business or course. This slice only reports what is there.",
  });

  findings.push({
    id: "alt",
    severity: missingAlt > 0 ? "warn" : "ok",
    title: "Image text",
    detail:
      images.length === 0
        ? "No image tags were found on this HTML page."
        : `${missingAlt} of ${images.length} images are missing an alt attribute.`,
    recommendation:
      missingAlt > 0
        ? "Add short alt text on the connected website for images that show meaning."
        : "Image alt attributes look complete on this page.",
  });

  if (input.robotsText === null) {
    findings.push({
      id: "robots-file",
      severity: "warn",
      title: "robots.txt",
      detail: "GroovGro could not read robots.txt at the website origin.",
      recommendation:
        "Add a robots.txt file on the connected site. Do not block the whole site unless that is intentional.",
    });
  } else {
    findings.push({
      id: "robots-file",
      severity: /disallow:\s*\/\s*$/im.test(input.robotsText) ? "warn" : "ok",
      title: "robots.txt",
      detail: "robots.txt was found.",
      recommendation: /disallow:\s*\/\s*$/im.test(input.robotsText)
        ? "robots.txt looks like it blocks the whole site. Check that before expecting search results."
        : "A robots.txt file is in place.",
    });
  }

  findings.push({
    id: "sitemap",
    severity: input.sitemapFound ? "ok" : "warn",
    title: "Sitemap",
    detail: input.sitemapFound
      ? "A sitemap was found (sitemap.xml or a sitemap line in robots.txt)."
      : "No sitemap.xml was found at the origin.",
    recommendation: input.sitemapFound
      ? "A sitemap is available for search tools."
      : "Add a sitemap.xml on the connected website listing the public pages.",
  });

  const score = scoreFindings(findings);
  const fails = findings.filter((item) => item.severity === "fail").length;
  const warns = findings.filter((item) => item.severity === "warn").length;
  const summary =
    fails > 0
      ? `This homepage has ${fails} issue${fails === 1 ? "" : "s"} to fix first, and ${warns} item${warns === 1 ? "" : "s"} to review. GroovGro did not change the website.`
      : warns > 0
        ? `No blocking issues. ${warns} item${warns === 1 ? "" : "s"} could be clearer. GroovGro did not change the website.`
        : "This homepage looks complete for a first technical check. GroovGro did not change the website.";

  return { findings, score, summary };
}

export function scoreFindings(findings: SeoFinding[]): number {
  let score = 100;
  for (const finding of findings) {
    if (finding.severity === "fail") score -= 16;
    if (finding.severity === "warn") score -= 7;
  }
  return Math.max(0, Math.min(100, score));
}

export function isSafePublicHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local") ||
      host === "0.0.0.0"
    ) {
      return null;
    }
    if (isPrivateHostname(host)) return null;
    return url;
  } catch {
    return null;
  }
}

function isPrivateHostname(host: string): boolean {
  if (host === "::1" || host.startsWith("[")) return true;
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;
  const parts = ipv4.slice(1).map(Number);
  if (parts.some((part) => part > 255)) return true;
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}
