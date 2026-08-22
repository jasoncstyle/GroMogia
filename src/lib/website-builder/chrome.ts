import { isSafeBuilderImageUrl } from "@/lib/website-builder/sections";

export const MAX_HEADER_NAME = 80;
export const MAX_FOOTER_TEXT = 200;

export type BuilderChrome = {
  showHeader: boolean
  showFooter: boolean
  showPageLinks: boolean
  headerName: string
  logoUrl: string
  footerText: string
};

export type ResolvedBuilderChrome = {
  showHeader: boolean
  showFooter: boolean
  showPageLinks: boolean
  title: string
  logoUrl: string
  footerText: string
};

export const DEFAULT_BUILDER_CHROME: BuilderChrome = {
  showHeader: true,
  showFooter: true,
  showPageLinks: true,
  headerName: "",
  logoUrl: "",
  footerText: "",
};

function clip(value: string, max: number) {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function parseChromeLogoUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const url = value.trim();
  if (!url) return "";
  if (!isSafeBuilderImageUrl(url) || !url.startsWith("https://")) {
    throw new Error("Use a public https:// photo for the logo, or leave it blank.");
  }
  return url;
}

export function parseBuilderChrome(input: Partial<BuilderChrome> | null | undefined): BuilderChrome {
  return {
    showHeader: input?.showHeader !== false,
    showFooter: input?.showFooter !== false,
    showPageLinks: input?.showPageLinks !== false,
    headerName: clip(typeof input?.headerName === "string" ? input.headerName : "", MAX_HEADER_NAME),
    logoUrl: (() => {
      try {
        return parseChromeLogoUrl(input?.logoUrl ?? "");
      } catch {
        return "";
      }
    })(),
    footerText: clip(typeof input?.footerText === "string" ? input.footerText : "", MAX_FOOTER_TEXT),
  };
}

export function resolveBuilderChrome(
  chrome: BuilderChrome,
  fallbackName: string,
): ResolvedBuilderChrome {
  const parsed = parseBuilderChrome(chrome);
  const title = parsed.headerName || clip(fallbackName, MAX_HEADER_NAME) || "Home";
  return {
    showHeader: parsed.showHeader,
    showFooter: parsed.showFooter,
    showPageLinks: parsed.showPageLinks,
    title,
    logoUrl: parsed.logoUrl,
    footerText: parsed.footerText || title,
  };
}
