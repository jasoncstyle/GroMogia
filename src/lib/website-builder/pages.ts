import type { BuilderRowDraft } from "@/lib/website-builder/row-templates";
import { DEFAULT_BUILDER_THEME, type BuilderTheme } from "@/lib/website-builder/style";
import {
  isBuilderTemplateId,
  layoutForTemplate,
  themeForTemplate,
  type BuilderBrandInput,
} from "@/lib/website-builder/templates";

/** Home is stored with an empty slug and served at `/w/[org]`. */
export const HOME_PAGE_SLUG = "";

export const BLANK_PAGE_TEMPLATE_ID = "blank";

export const MAX_BUILDER_PAGES = 20;

const RESERVED_PAGE_SLUGS = new Set([
  "home",
  "app",
  "api",
  "w",
  "www",
  "preview",
  "admin",
  "login",
  "signup",
  "website-builder",
]);

export function isHomePageSlug(slug: string | null | undefined): boolean {
  return !slug;
}

export function isBlankPageTemplate(templateId: string | null | undefined): boolean {
  return templateId === BLANK_PAGE_TEMPLATE_ID;
}

export function builderPageLabel(page: { slug: string; title: string }): string {
  return isHomePageSlug(page.slug) ? "Home" : page.title.trim() || "Untitled page";
}

export function uniqueSavedHomeSlug(existingSlugs: string[]): string {
  const taken = new Set(existingSlugs.filter(Boolean));
  if (!taken.has("saved-home")) return "saved-home";
  for (let index = 2; index <= MAX_BUILDER_PAGES; index += 1) {
    const slug = `saved-home-${index}`;
    if (!taken.has(slug)) return slug;
  }
  throw new Error("Too many saved Home pages. Delete an unused extra page first.");
}

export function uniqueSavedHomeTitle(existingTitles: string[]): string {
  const taken = new Set(existingTitles.map((title) => title.trim().toLowerCase()));
  if (!taken.has("previous home")) return "Previous Home";
  for (let index = 2; index <= MAX_BUILDER_PAGES; index += 1) {
    const title = `Previous Home ${index}`;
    if (!taken.has(title.toLowerCase())) return title;
  }
  return "Previous Home";
}

export function suggestPageSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function parsePageSlug(value: unknown): string {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  const slug = raw.replace(/^\/+|\/+$/g, "");
  if (!slug) {
    throw new Error("Choose an address for this page, such as about.");
  }
  if (slug === HOME_PAGE_SLUG || RESERVED_PAGE_SLUGS.has(slug)) {
    throw new Error("That address is reserved. Try about, services, or a similar word.");
  }
  if (slug.length > 48) {
    throw new Error("Keep the page address to 48 characters or fewer.");
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Use lowercase letters, numbers, and dashes only.");
  }
  return slug;
}

export function builderPagePath(orgSlug: string, pageSlug = HOME_PAGE_SLUG): string {
  const org = orgSlug.replace(/^\/+|\/+$/g, "");
  const slug = pageSlug.replace(/^\/+|\/+$/g, "");
  return slug ? `/w/${org}/${slug}` : `/w/${org}`;
}

export function layoutForNewPage(
  templateId: string,
  input: BuilderBrandInput,
): { rows: BuilderRowDraft[]; theme: BuilderTheme; templateId: string } {
  if (isBlankPageTemplate(templateId)) {
    return {
      rows: [
        {
          columnWidths: [100],
          contentWidth: "normal",
          backgroundColor: "",
          widgets: [],
        },
      ],
      theme: { ...DEFAULT_BUILDER_THEME },
      templateId: BLANK_PAGE_TEMPLATE_ID,
    };
  }
  const id = isBuilderTemplateId(templateId) ? templateId : "1";
  return {
    rows: layoutForTemplate(id, input),
    theme: themeForTemplate(id),
    templateId: id,
  };
}
