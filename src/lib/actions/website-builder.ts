"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import {
  brandSettings,
  businessBrains,
  builderChrome,
  builderRows,
  builderSections,
  builderSites,
  seoDrafts,
} from "@/lib/db/schema";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession } from "@/lib/require-org";
import {
  applyApprovedSeoDraftToBuilderState,
  isBuilderApplyableFinding,
} from "@/lib/website-builder/apply-seo";
import {
  clampColumnIndex,
  isRowLayoutId,
  parseColumnWidths,
  parseContentWidth,
  widthsForLayout,
} from "@/lib/website-builder/layout";
import {
  MAX_FOOTER_TEXT,
  MAX_HEADER_NAME,
  parseBuilderChrome,
  parseChromeLogoUrl,
} from "@/lib/website-builder/chrome";
import { MAX_INNER_ROWS_PER_COLUMN } from "@/lib/website-builder/nest";
import {
  copyBuilderSiteContent,
  writeBuilderLayout,
} from "@/lib/website-builder/persist-layout";
import {
  INSPIRED_TEMPLATE_ID,
  MAX_COPY_URLS,
  MAX_LAYOUT_URLS,
  draftInspiredRows,
  inspiredTheme,
  parseInspirationUrls,
} from "@/lib/website-builder/inspiration";
import { extractWebsitePage } from "@/lib/growth/website-discover";
import { fetchPublicText } from "@/lib/seo/fetch";
import {
  HOME_PAGE_SLUG,
  MAX_BUILDER_PAGES,
  builderPageLabel,
  isHomePageSlug,
  layoutForNewPage,
  parsePageSlug,
  suggestPageSlug,
  uniqueSavedHomeSlug,
  uniqueSavedHomeTitle,
} from "@/lib/website-builder/pages";
import {
  defaultContentForType,
  isBuilderSectionType,
  parseBuilderSectionContent,
  contentFromFormData,
} from "@/lib/website-builder/sections";
import { parseBuilderColor, parseBuilderTheme, inheritRowBackgrounds } from "@/lib/website-builder/style";
import {
  DEFAULT_BUILDER_TEMPLATE_ID,
  isBuilderTemplateId,
  layoutForTemplate,
  themeForTemplate,
} from "@/lib/website-builder/templates";

function revalidateBuilder(
  organizationSlug?: string | null,
  page?: { id: string; slug: string } | null,
) {
  revalidatePath("/app/website-builder");
  revalidatePath("/app/website-builder/preview");
  if (organizationSlug) {
    revalidatePath(`/w/${organizationSlug}`, "layout");
    if (page && !isHomePageSlug(page.slug)) {
      revalidatePath(`/w/${organizationSlug}/${page.slug}`);
    }
  }
}

async function requireBuilderEditor() {
  const session = await requireOrgSession();
  if (!hasPermission(session.permissions, "manage_website")) {
    throw new Error("You do not have permission to edit the GroovGro website.");
  }
  const db = getDb();
  if (!db) throw new Error("Database is not configured");
  return { session, db };
}

async function requireBuilderPage(
  db: NonNullable<ReturnType<typeof getDb>>,
  organizationId: string,
  formData?: FormData,
) {
  const pageId = formData ? String(formData.get("pageId") ?? "").trim() : "";
  if (pageId) {
    const [page] = await db
      .select()
      .from(builderSites)
      .where(
        and(eq(builderSites.id, pageId), eq(builderSites.organizationId, organizationId)),
      )
      .limit(1);
    if (!page) throw new Error("That page was not found.");
    return page;
  }
  const [home] = await db
    .select()
    .from(builderSites)
    .where(
      and(
        eq(builderSites.organizationId, organizationId),
        eq(builderSites.slug, HOME_PAGE_SLUG),
      ),
    )
    .limit(1);
  if (!home) throw new Error("Create the GroovGro website first.");
  return home;
}

export async function createBuilderSite(formData: FormData): Promise<ActionResult> {
  return runAction("Could not create the GroovGro website.", async () => {
    const { session, db } = await requireBuilderEditor();
    const [existing] = await db
      .select()
      .from(builderSites)
      .where(
        and(
          eq(builderSites.organizationId, session.organizationId),
          eq(builderSites.slug, HOME_PAGE_SLUG),
        ),
      )
      .limit(1);
    if (existing) {
      throw new Error("This organization already has a GroovGro website.");
    }

    const templateId = String(formData.get("templateId") ?? DEFAULT_BUILDER_TEMPLATE_ID);
    const [brand] = await db
      .select()
      .from(brandSettings)
      .where(eq(brandSettings.organizationId, session.organizationId))
      .limit(1);
    const title = brand?.businessName || session.organizationName || "Website";
    await db.insert(builderSites).values({
      organizationId: session.organizationId,
      title,
      slug: HOME_PAGE_SLUG,
      status: "draft",
      theme: themeForTemplate(templateId),
      templateId: isBuilderTemplateId(templateId)
        ? templateId
        : DEFAULT_BUILDER_TEMPLATE_ID,
      createdBy: session.userId,
    });
    const [site] = await db
      .select()
      .from(builderSites)
      .where(
        and(
          eq(builderSites.organizationId, session.organizationId),
          eq(builderSites.slug, HOME_PAGE_SLUG),
        ),
      )
      .limit(1);
    if (!site) throw new Error("Could not create the GroovGro website.");

    await writeBuilderLayout(db, {
      organizationId: session.organizationId,
      siteId: site.id,
      rows: layoutForTemplate(templateId, {
        businessName: brand?.businessName || session.organizationName || "",
        description: brand?.description ?? "",
        targetCustomers: brand?.targetCustomers ?? "",
      }),
    });

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "website_builder.created",
      targetType: "builder_site",
      targetId: site.id,
      metadata: {
        templateId: isBuilderTemplateId(templateId)
          ? templateId
          : DEFAULT_BUILDER_TEMPLATE_ID,
      },
    });
    revalidateBuilder(session.organizationSlug, site);
    return "Draft website created. It is not public until you publish.";
  });
}

async function loadPublicPages(urls: string[]) {
  const pages = [];
  for (const url of urls) {
    const fetched = await fetchPublicText(url);
    if (!fetched.ok || !fetched.body) continue;
    pages.push(extractWebsitePage(url, fetched.body, "connected_website"));
  }
  return pages;
}

export async function draftInspiredBuilderSite(
  formData: FormData,
): Promise<ActionResult> {
  return runAction("Could not draft the GroovGro website.", async () => {
    const { session, db } = await requireBuilderEditor();
    const [existing] = await db
      .select()
      .from(builderSites)
      .where(
        and(
          eq(builderSites.organizationId, session.organizationId),
          eq(builderSites.slug, HOME_PAGE_SLUG),
        ),
      )
      .limit(1);

    const layoutUrls = parseInspirationUrls(
      [
        String(formData.get("layoutUrl1") ?? ""),
        String(formData.get("layoutUrl2") ?? ""),
        String(formData.get("layoutUrl3") ?? ""),
      ],
      MAX_LAYOUT_URLS,
    );
    const copyUrls = parseInspirationUrls(
      [
        String(formData.get("copyUrl1") ?? ""),
        String(formData.get("copyUrl2") ?? ""),
        String(formData.get("copyUrl3") ?? ""),
        String(formData.get("copyUrl4") ?? ""),
        String(formData.get("copyUrl5") ?? ""),
      ],
      MAX_COPY_URLS,
    );
    if (layoutUrls.length === 0) {
      throw new Error("Paste at least one public website you like the layout of.");
    }

    const businessType = z
      .string()
      .trim()
      .max(80)
      .parse(formData.get("businessType") ?? "");

    const [brand, brain] = await Promise.all([
      db
        .select()
        .from(brandSettings)
        .where(eq(brandSettings.organizationId, session.organizationId))
        .limit(1)
        .then((rows) => rows[0] ?? null),
      db
        .select()
        .from(businessBrains)
        .where(eq(businessBrains.organizationId, session.organizationId))
        .limit(1)
        .then((rows) => rows[0] ?? null),
    ]);

    const layoutPages = await loadPublicPages(layoutUrls);
    if (layoutPages.length === 0) {
      throw new Error(
        "GroovGro could not open those layout pages. Use public https addresses that open without a login.",
      );
    }
    const copyPages = await loadPublicPages(copyUrls);
    const title = brand?.businessName || session.organizationName || "Website";
    const rows = draftInspiredRows({
      businessName: brand?.businessName || session.organizationName || "",
      description: brand?.description ?? "",
      targetCustomers: brand?.targetCustomers ?? "",
      businessType: businessType || brain?.industry || "",
      layoutPages,
      copyPages,
    });

    let savedPageTitle = "";
    let site = existing ?? null;

    if (existing) {
      const allPages = await db
        .select({
          id: builderSites.id,
          slug: builderSites.slug,
          title: builderSites.title,
        })
        .from(builderSites)
        .where(eq(builderSites.organizationId, session.organizationId));
      if (allPages.length >= MAX_BUILDER_PAGES) {
        throw new Error(
          "This website already has the maximum number of pages. Delete an unused extra page, then try again.",
        );
      }
      savedPageTitle = uniqueSavedHomeTitle(allPages.map((page) => page.title));
      const savedSlug = uniqueSavedHomeSlug(allPages.map((page) => page.slug));
      const savedId = crypto.randomUUID();
      await db.insert(builderSites).values({
        id: savedId,
        organizationId: session.organizationId,
        title: savedPageTitle,
        slug: savedSlug,
        metaDescription: existing.metaDescription,
        status: "draft",
        theme: existing.theme,
        templateId: existing.templateId,
        createdBy: session.userId,
      });
      await copyBuilderSiteContent(db, {
        organizationId: session.organizationId,
        fromSiteId: existing.id,
        toSiteId: savedId,
      });
      await db
        .update(builderSites)
        .set({
          title,
          status: "draft",
          theme: inspiredTheme(),
          templateId: INSPIRED_TEMPLATE_ID,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(builderSites.id, existing.id),
            eq(builderSites.organizationId, session.organizationId),
          ),
        );
      site = existing;
    } else {
      await db.insert(builderSites).values({
        organizationId: session.organizationId,
        title,
        slug: HOME_PAGE_SLUG,
        status: "draft",
        theme: inspiredTheme(),
        templateId: INSPIRED_TEMPLATE_ID,
        createdBy: session.userId,
      });
      const [created] = await db
        .select()
        .from(builderSites)
        .where(
          and(
            eq(builderSites.organizationId, session.organizationId),
            eq(builderSites.slug, HOME_PAGE_SLUG),
          ),
        )
        .limit(1);
      site = created ?? null;
    }

    if (!site) throw new Error("Could not create the GroovGro website.");

    await writeBuilderLayout(db, {
      organizationId: session.organizationId,
      siteId: site.id,
      rows,
    });

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "website_builder.inspired",
      targetType: "builder_site",
      targetId: site.id,
      metadata: {
        layoutCount: layoutPages.length,
        copyCount: copyPages.length,
        businessType: businessType || brain?.industry || "",
        savedPreviousHome: Boolean(savedPageTitle),
      },
    });
    revalidateBuilder(session.organizationSlug, site);
    if (savedPageTitle) {
      return `Your previous Home was saved as “${savedPageTitle}” (still a draft). The new Home is unpublished until you publish. Edit every line. The connected live site was not changed.`;
    }
    return `Draft website created from ${layoutPages.length} layout page${layoutPages.length === 1 ? "" : "s"}. It is not public until you publish. Edit every line. The live connected site was not changed.`;
  });
}

export async function saveBuilderSite(formData: FormData): Promise<ActionResult> {
  return runAction("Could not save the website details.", async () => {
    const { session, db } = await requireBuilderEditor();
    const title = z.string().trim().min(1).max(120).parse(formData.get("title"));
    const metaDescription = z
      .string()
      .trim()
      .max(160)
      .parse(formData.get("metaDescription") ?? "");
    const site = await requireBuilderPage(db, session.organizationId, formData);
    const previousTheme = parseBuilderTheme(site.theme);
    const theme = formData.has("pageBackground")
      ? parseBuilderTheme({
          pageBackground: formData.get("pageBackground"),
          textColor: formData.get("textColor"),
          headingColor: formData.get("headingColor"),
          buttonBackground: formData.get("buttonBackground"),
          buttonText: formData.get("buttonText"),
        })
      : previousTheme;

    await db
      .update(builderSites)
      .set({ title, metaDescription, theme, updatedAt: new Date() })
      .where(
        and(
          eq(builderSites.id, site.id),
          eq(builderSites.organizationId, session.organizationId),
        ),
      );

    if (formData.has("pageBackground")) {
      const applyToAllRows = formData.get("applyPageBackgroundToRows") === "on";
      const rows = await db
        .select({
          id: builderRows.id,
          backgroundColor: builderRows.backgroundColor,
        })
        .from(builderRows)
        .where(
          and(
            eq(builderRows.siteId, site.id),
            eq(builderRows.organizationId, session.organizationId),
          ),
        );
      const nextColors = inheritRowBackgrounds(
        rows.map((row) => row.backgroundColor),
        previousTheme.pageBackground,
        applyToAllRows,
      );
      for (const [index, row] of rows.entries()) {
        const backgroundColor = nextColors[index] ?? "";
        if (backgroundColor === parseBuilderColor(row.backgroundColor)) continue;
        await db
          .update(builderRows)
          .set({ backgroundColor, updatedAt: new Date() })
          .where(eq(builderRows.id, row.id));
      }
    }

    revalidateBuilder(session.organizationSlug);
    return formData.has("pageBackground") ? "Page colors saved." : "Website details saved.";
  });
}

export async function saveBuilderSection(formData: FormData): Promise<ActionResult> {
  return runAction("Could not save that section.", async () => {
    const { session, db } = await requireBuilderEditor();
    const sectionId = String(formData.get("sectionId") ?? "");
    const [section] = await db
      .select()
      .from(builderSections)
      .where(
        and(
          eq(builderSections.id, sectionId),
          eq(builderSections.organizationId, session.organizationId),
        ),
      )
      .limit(1);
    if (!section) throw new Error("That section was not found.");
    if (!isBuilderSectionType(section.type)) {
      throw new Error("That section type is not supported.");
    }

    const content = parseBuilderSectionContent(section.type, contentFromFormData(formData));
    const visible = formData.get("visible") === "on";

    await db
      .update(builderSections)
      .set({ content, visible, updatedAt: new Date() })
      .where(eq(builderSections.id, section.id));
    revalidateBuilder(session.organizationSlug);
    return "Section saved.";
  });
}

export async function addBuilderSection(formData: FormData): Promise<ActionResult> {
  return runAction("Could not add a section.", async () => {
    const { session, db } = await requireBuilderEditor();
    const type = String(formData.get("type") ?? "");
    if (!isBuilderSectionType(type)) {
      throw new Error("Choose a section type.");
    }
    const site = await requireBuilderPage(db, session.organizationId, formData);

    const rowId = String(formData.get("rowId") ?? "");
    const [row] = rowId
      ? await db
          .select()
          .from(builderRows)
          .where(
            and(
              eq(builderRows.id, rowId),
              eq(builderRows.organizationId, session.organizationId),
            ),
          )
          .limit(1)
      : [];
    const columnWidths = parseColumnWidths(row?.columnWidths ?? [100]);
    if (row && row.siteId !== site.id) throw new Error("That row was not found.");
    let targetRowId = row?.id;
    if (!targetRowId) {
      const existingRows = await db
        .select({ sortOrder: builderRows.sortOrder })
        .from(builderRows)
        .where(eq(builderRows.siteId, site.id))
        .orderBy(asc(builderRows.sortOrder));
      const [created] = await db
        .insert(builderRows)
        .values({
          organizationId: session.organizationId,
          siteId: site.id,
          sortOrder: (existingRows.at(-1)?.sortOrder ?? -1) + 1,
          columnWidths: [100],
        })
        .returning({ id: builderRows.id });
      targetRowId = created?.id;
      if (!targetRowId) throw new Error("Could not add a row for that widget.");
    }
    const columnIndex = clampColumnIndex(
      Number(formData.get("columnIndex") ?? 0),
      (row ? columnWidths : [100]).length,
    );
    const siblings = await db
      .select({ sortOrder: builderSections.sortOrder })
      .from(builderSections)
      .where(
        and(
          eq(builderSections.rowId, targetRowId),
          eq(builderSections.columnIndex, columnIndex),
        ),
      )
      .orderBy(asc(builderSections.sortOrder));
    const content = parseBuilderSectionContent(
      type,
      defaultContentForType(type, site.title),
    );

    await db.insert(builderSections).values({
      organizationId: session.organizationId,
      siteId: site.id,
      rowId: targetRowId,
      columnIndex,
      type,
      sortOrder: (siblings.at(-1)?.sortOrder ?? -1) + 1,
      visible: true,
      content,
    });
    revalidateBuilder(session.organizationSlug);
    return "Widget added.";
  });
}

export async function moveBuilderSection(formData: FormData): Promise<ActionResult> {
  return runAction("Could not move that section.", async () => {
    const { session, db } = await requireBuilderEditor();
    const sectionId = String(formData.get("sectionId") ?? "");
    const direction = String(formData.get("direction") ?? "");
    const [current] = await db
      .select()
      .from(builderSections)
      .where(
        and(
          eq(builderSections.id, sectionId),
          eq(builderSections.organizationId, session.organizationId),
        ),
      )
      .limit(1);
    if (!current) throw new Error("That section was not found.");
    const sections = await db
      .select()
      .from(builderSections)
      .where(
        and(
          eq(builderSections.organizationId, session.organizationId),
          eq(builderSections.rowId, current.rowId ?? ""),
          eq(builderSections.columnIndex, current.columnIndex),
        ),
      )
      .orderBy(asc(builderSections.sortOrder));
    const index = sections.findIndex((section) => section.id === sectionId);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    const other = sections[swapWith];
    if (index < 0 || !other) return "Section is already at the end.";

    await db
      .update(builderSections)
      .set({ sortOrder: other.sortOrder, updatedAt: new Date() })
      .where(eq(builderSections.id, current.id));
    await db
      .update(builderSections)
      .set({ sortOrder: current.sortOrder, updatedAt: new Date() })
      .where(eq(builderSections.id, other.id));
    revalidateBuilder(session.organizationSlug);
    return "Section order saved.";
  });
}

export async function reorderBuilderSections(formData: FormData): Promise<ActionResult> {
  return runAction("Could not save the section order.", async () => {
    const { session, db } = await requireBuilderEditor();
    const orderedIds = formData
      .getAll("sectionIds")
      .map((value) => String(value))
      .filter(Boolean);
    if (orderedIds.length === 0) {
      throw new Error("Move a section onto the page first.");
    }

    const site = await requireBuilderPage(db, session.organizationId, formData);
    const sections = await db
      .select()
      .from(builderSections)
      .where(
        and(
          eq(builderSections.organizationId, session.organizationId),
          eq(builderSections.siteId, site.id),
        ),
      )
      .orderBy(asc(builderSections.sortOrder));
    if (orderedIds.length !== sections.length) {
      throw new Error("Reload the page, then try moving the section again.");
    }
    const allowed = new Set(sections.map((section) => section.id));
    if (orderedIds.some((id) => !allowed.has(id))) {
      throw new Error("That section was not found.");
    }

    for (const [sortOrder, sectionId] of orderedIds.entries()) {
      await db
        .update(builderSections)
        .set({ sortOrder, updatedAt: new Date() })
        .where(
          and(
            eq(builderSections.id, sectionId),
            eq(builderSections.organizationId, session.organizationId),
          ),
        );
    }
    revalidateBuilder(session.organizationSlug);
    return "Section order saved.";
  });
}

export async function removeBuilderSection(formData: FormData): Promise<ActionResult> {
  return runAction("Could not remove that section.", async () => {
    const { session, db } = await requireBuilderEditor();
    const sectionId = String(formData.get("sectionId") ?? "");
    const deleted = await db
      .delete(builderSections)
      .where(
        and(
          eq(builderSections.id, sectionId),
          eq(builderSections.organizationId, session.organizationId),
        ),
      )
      .returning({ id: builderSections.id });
    if (deleted.length === 0) throw new Error("That section was not found.");
    revalidateBuilder(session.organizationSlug);
    return "Section removed.";
  });
}

export async function addBuilderRow(formData: FormData): Promise<ActionResult> {
  return runAction("Could not add a row.", async () => {
    const { session, db } = await requireBuilderEditor();
    const layoutId = String(formData.get("layoutId") ?? "1");
    if (!isRowLayoutId(layoutId)) throw new Error("Choose a row layout.");
    const site = await requireBuilderPage(db, session.organizationId, formData);
    const parentRowId = String(formData.get("parentRowId") ?? "").trim() || null;
    const parentColumnRaw = String(formData.get("parentColumnIndex") ?? "").trim();
    const parentColumnIndex =
      parentColumnRaw === "" ? null : Number(parentColumnRaw);
    if ((parentRowId && parentColumnIndex == null) || (!parentRowId && parentColumnIndex != null)) {
      throw new Error("An inner row needs both a parent row and a column.");
    }
    if (parentColumnIndex != null && !Number.isInteger(parentColumnIndex)) {
      throw new Error("That column was not found.");
    }

    let sortOrder = 0;
    let contentWidth: "normal" | "full" = "normal";
    if (parentRowId && parentColumnIndex != null) {
      const [parent] = await db
        .select()
        .from(builderRows)
        .where(
          and(
            eq(builderRows.id, parentRowId),
            eq(builderRows.organizationId, session.organizationId),
            eq(builderRows.siteId, site.id),
          ),
        )
        .limit(1);
      if (!parent) throw new Error("That column was not found.");
      if (parent.parentRowId) {
        throw new Error("An inner row cannot have another inner row inside it.");
      }
      if (parentColumnIndex < 0 || parentColumnIndex >= parent.columnWidths.length) {
        throw new Error("That column was not found.");
      }
      const siblings = await db
        .select({ sortOrder: builderRows.sortOrder })
        .from(builderRows)
        .where(
          and(
            eq(builderRows.siteId, site.id),
            eq(builderRows.parentRowId, parentRowId),
            eq(builderRows.parentColumnIndex, parentColumnIndex),
          ),
        )
        .orderBy(asc(builderRows.sortOrder));
      if (siblings.length >= MAX_INNER_ROWS_PER_COLUMN) {
        throw new Error("This column already has three inner rows. Remove one first.");
      }
      sortOrder = (siblings.at(-1)?.sortOrder ?? -1) + 1;
      contentWidth = "full";
    } else {
      const existing = await db
        .select({ sortOrder: builderRows.sortOrder })
        .from(builderRows)
        .where(and(eq(builderRows.siteId, site.id), isNull(builderRows.parentRowId)))
        .orderBy(asc(builderRows.sortOrder));
      sortOrder = (existing.at(-1)?.sortOrder ?? -1) + 1;
    }

    await db.insert(builderRows).values({
      organizationId: session.organizationId,
      siteId: site.id,
      sortOrder,
      columnWidths: widthsForLayout(layoutId),
      contentWidth,
      parentRowId,
      parentColumnIndex,
    });
    revalidateBuilder(session.organizationSlug);
    return parentRowId
      ? "Inner row added. Click Add widget in a column."
      : "Row added. Click Add widget in a column.";
  });
}

export async function removeBuilderRow(formData: FormData): Promise<ActionResult> {
  return runAction("Could not remove that row.", async () => {
    const { session, db } = await requireBuilderEditor();
    const rowId = String(formData.get("rowId") ?? "");
    const deleted = await db
      .delete(builderRows)
      .where(
        and(
          eq(builderRows.id, rowId),
          eq(builderRows.organizationId, session.organizationId),
        ),
      )
      .returning({ id: builderRows.id });
    if (deleted.length === 0) throw new Error("That row was not found.");
    revalidateBuilder(session.organizationSlug);
    return "Row removed.";
  });
}

export async function moveBuilderRow(formData: FormData): Promise<ActionResult> {
  return runAction("Could not move that row.", async () => {
    const { session, db } = await requireBuilderEditor();
    const rowId = String(formData.get("rowId") ?? "");
    const direction = String(formData.get("direction") ?? "");
    const site = await requireBuilderPage(db, session.organizationId, formData);
    const rows = await db
      .select()
      .from(builderRows)
      .where(
        and(
          eq(builderRows.organizationId, session.organizationId),
          eq(builderRows.siteId, site.id),
        ),
      )
      .orderBy(asc(builderRows.sortOrder));
    const current = rows.find((row) => row.id === rowId);
    if (!current) throw new Error("That row was not found.");
    const siblings = rows
      .filter((row) =>
        current.parentRowId
          ? row.parentRowId === current.parentRowId &&
            row.parentColumnIndex === current.parentColumnIndex
          : !row.parentRowId,
      )
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const index = siblings.findIndex((row) => row.id === rowId);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    const other = siblings[swapWith];
    if (!other) return "Row is already at the end.";
    await db
      .update(builderRows)
      .set({ sortOrder: other.sortOrder, updatedAt: new Date() })
      .where(eq(builderRows.id, current.id));
    await db
      .update(builderRows)
      .set({ sortOrder: current.sortOrder, updatedAt: new Date() })
      .where(eq(builderRows.id, other.id));
    revalidateBuilder(session.organizationSlug);
    return "Row order saved.";
  });
}

export async function setBuilderRowLayout(formData: FormData): Promise<ActionResult> {
  return runAction("Could not change that row layout.", async () => {
    const { session, db } = await requireBuilderEditor();
    const rowId = String(formData.get("rowId") ?? "");
    const layoutId = String(formData.get("layoutId") ?? "");
    if (!isRowLayoutId(layoutId)) throw new Error("Choose a row layout.");
    const [row] = await db
      .select()
      .from(builderRows)
      .where(
        and(
          eq(builderRows.id, rowId),
          eq(builderRows.organizationId, session.organizationId),
        ),
      )
      .limit(1);
    if (!row) throw new Error("That row was not found.");
    const columnWidths = widthsForLayout(layoutId);
    await db
      .update(builderRows)
      .set({ columnWidths, updatedAt: new Date() })
      .where(eq(builderRows.id, row.id));
    const widgets = await db
      .select()
      .from(builderSections)
      .where(eq(builderSections.rowId, row.id));
    for (const widget of widgets) {
      const nextIndex = clampColumnIndex(widget.columnIndex, columnWidths.length);
      if (nextIndex !== widget.columnIndex) {
        await db
          .update(builderSections)
          .set({ columnIndex: nextIndex, updatedAt: new Date() })
          .where(eq(builderSections.id, widget.id));
      }
    }
    const innerRows = await db
      .select()
      .from(builderRows)
      .where(
        and(
          eq(builderRows.parentRowId, row.id),
          eq(builderRows.organizationId, session.organizationId),
        ),
      );
    for (const inner of innerRows) {
      const nextIndex = clampColumnIndex(inner.parentColumnIndex ?? 0, columnWidths.length);
      if (nextIndex !== inner.parentColumnIndex) {
        await db
          .update(builderRows)
          .set({ parentColumnIndex: nextIndex, updatedAt: new Date() })
          .where(eq(builderRows.id, inner.id));
      }
    }
    revalidateBuilder(session.organizationSlug);
    return "Row layout saved. Columns that no longer exist moved their widgets and inner rows into the last column.";
  });
}

export async function setBuilderRowWidth(formData: FormData): Promise<ActionResult> {
  return runAction("Could not change that row width.", async () => {
    const { session, db } = await requireBuilderEditor();
    const rowId = String(formData.get("rowId") ?? "");
    const contentWidth = parseContentWidth(formData.get("contentWidth"));
    const updated = await db
      .update(builderRows)
      .set({ contentWidth, updatedAt: new Date() })
      .where(
        and(
          eq(builderRows.id, rowId),
          eq(builderRows.organizationId, session.organizationId),
        ),
      )
      .returning({ id: builderRows.id });
    if (updated.length === 0) throw new Error("That row was not found.");
    revalidateBuilder(session.organizationSlug);
    return "Row width saved.";
  });
}

export async function setBuilderRowBackground(formData: FormData): Promise<ActionResult> {
  return runAction("Could not change that row color.", async () => {
    const { session, db } = await requireBuilderEditor();
    const rowId = String(formData.get("rowId") ?? "");
    const backgroundColor = parseBuilderColor(formData.get("backgroundColor"));
    const updated = await db
      .update(builderRows)
      .set({ backgroundColor, updatedAt: new Date() })
      .where(
        and(
          eq(builderRows.id, rowId),
          eq(builderRows.organizationId, session.organizationId),
        ),
      )
      .returning({ id: builderRows.id });
    if (updated.length === 0) throw new Error("That row was not found.");
    revalidateBuilder(session.organizationSlug);
    return "Row color saved.";
  });
}

export async function placeBuilderWidget(formData: FormData): Promise<ActionResult> {
  return runAction("Could not move that widget.", async () => {
    const { session, db } = await requireBuilderEditor();
    const sectionId = String(formData.get("sectionId") ?? "");
    const rowId = String(formData.get("rowId") ?? "");
    const [section] = await db
      .select()
      .from(builderSections)
      .where(
        and(
          eq(builderSections.id, sectionId),
          eq(builderSections.organizationId, session.organizationId),
        ),
      )
      .limit(1);
    if (!section) throw new Error("That widget was not found.");
    const [row] = await db
      .select()
      .from(builderRows)
      .where(
        and(
          eq(builderRows.id, rowId),
          eq(builderRows.organizationId, session.organizationId),
        ),
      )
      .limit(1);
    if (!row) throw new Error("Drop the widget onto a column.");
    if (row.siteId !== section.siteId) throw new Error("Drop the widget onto a column.");
    const columnIndex = clampColumnIndex(
      Number(formData.get("columnIndex") ?? 0),
      parseColumnWidths(row.columnWidths).length,
    );
    const siblings = await db
      .select({ sortOrder: builderSections.sortOrder })
      .from(builderSections)
      .where(
        and(
          eq(builderSections.rowId, row.id),
          eq(builderSections.columnIndex, columnIndex),
        ),
      )
      .orderBy(asc(builderSections.sortOrder));
    await db
      .update(builderSections)
      .set({
        rowId: row.id,
        columnIndex,
        sortOrder: (siblings.at(-1)?.sortOrder ?? -1) + 1,
        updatedAt: new Date(),
      })
      .where(eq(builderSections.id, section.id));
    revalidateBuilder(session.organizationSlug);
    return "Widget moved.";
  });
}

export async function publishBuilderSite(formData: FormData): Promise<ActionResult> {
  return runAction("Could not publish the website.", async () => {
    const { session, db } = await requireBuilderEditor();
    if (!hasPermission(session.permissions, "publish_website")) {
      throw new Error("You do not have permission to publish the GroovGro website.");
    }
    const site = await requireBuilderPage(db, session.organizationId, formData);

    await db
      .update(builderSites)
      .set({ status: "published", updatedAt: new Date() })
      .where(eq(builderSites.id, site.id));
    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "website_builder.published",
      targetType: "builder_site",
      targetId: site.id,
    });
    revalidateBuilder(session.organizationSlug);
    return "Published. This GroovGro page is live. The connected existing website was not changed.";
  });
}

export async function unpublishBuilderSite(formData: FormData): Promise<ActionResult> {
  return runAction("Could not unpublish the website.", async () => {
    const { session, db } = await requireBuilderEditor();
    if (!hasPermission(session.permissions, "publish_website")) {
      throw new Error("You do not have permission to unpublish the GroovGro website.");
    }
    const site = await requireBuilderPage(db, session.organizationId, formData);

    await db
      .update(builderSites)
      .set({ status: "draft", updatedAt: new Date() })
      .where(eq(builderSites.id, site.id));
    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "website_builder.unpublished",
      targetType: "builder_site",
      targetId: site.id,
    });
    revalidateBuilder(session.organizationSlug);
    return "Unpublished. The GroovGro page is hidden. The connected existing website was not changed.";
  });
}

export async function applyBuilderTemplate(formData: FormData): Promise<ActionResult> {
  return runAction("Could not apply that template.", async () => {
    const { session, db } = await requireBuilderEditor();
    const templateId = String(formData.get("templateId") ?? "");
    if (!isBuilderTemplateId(templateId)) {
      throw new Error("Choose a starting layout.");
    }
    const site = await requireBuilderPage(db, session.organizationId, formData);

    const [brand] = await db
      .select()
      .from(brandSettings)
      .where(eq(brandSettings.organizationId, session.organizationId))
      .limit(1);

    await writeBuilderLayout(db, {
      organizationId: session.organizationId,
      siteId: site.id,
      rows: layoutForTemplate(templateId, {
        businessName: brand?.businessName || session.organizationName || site.title,
        description: brand?.description ?? "",
        targetCustomers: brand?.targetCustomers ?? "",
      }),
    });
    await db
      .update(builderSites)
      .set({
        theme: themeForTemplate(templateId),
        templateId,
        updatedAt: new Date(),
      })
      .where(eq(builderSites.id, site.id));

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "website_builder.template_applied",
      targetType: "builder_site",
      targetId: site.id,
      metadata: { templateId },
    });
    revalidateBuilder(session.organizationSlug);
    return "Template applied to the GroovGro page. The connected existing website was not changed.";
  });
}

export async function applySeoDraftToBuilder(formData: FormData): Promise<ActionResult> {
  return runAction("Could not apply that draft to the GroovGro website.", async () => {
    const { session, db } = await requireBuilderEditor();
    if (!hasPermission(session.permissions, "manage_seo")) {
      throw new Error("You do not have permission to apply SEO drafts.");
    }

    const draftId = String(formData.get("draftId") ?? "");
    const [draft] = await db
      .select()
      .from(seoDrafts)
      .where(
        and(
          eq(seoDrafts.id, draftId),
          eq(seoDrafts.organizationId, session.organizationId),
        ),
      )
      .limit(1);
    if (!draft) throw new Error("That draft was not found.");
    if (draft.status !== "approved") {
      throw new Error("Approve the draft first, then apply it to the GroovGro website.");
    }
    if (!isBuilderApplyableFinding(draft.findingId)) {
      throw new Error("This draft is for the connected website, not the GroovGro-hosted page.");
    }

    const pageId = String(formData.get("pageId") ?? draft.builderSiteId ?? "").trim();
    const scoped = new FormData();
    if (pageId) scoped.set("pageId", pageId);
    const site = await requireBuilderPage(db, session.organizationId, scoped);

    const sections = await db
      .select()
      .from(builderSections)
      .where(
        and(
          eq(builderSections.organizationId, session.organizationId),
          eq(builderSections.siteId, site.id),
        ),
      )
      .orderBy(asc(builderSections.sortOrder));

    const next = applyApprovedSeoDraftToBuilderState(
      {
        title: site.title,
        metaDescription: site.metaDescription,
        sections,
      },
      { findingId: draft.findingId, proposedChange: draft.proposedChange },
    );

    await db
      .update(builderSites)
      .set({
        title: next.title,
        metaDescription: next.metaDescription,
        updatedAt: new Date(),
      })
      .where(eq(builderSites.id, site.id));

    if (next.appliedTo === "heroHeading") {
      const hero = next.sections.find((section) => section.type === "hero");
      if (hero) {
        await db
          .update(builderSections)
          .set({ content: hero.content, updatedAt: new Date() })
          .where(eq(builderSections.id, hero.id));
      }
    }

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "website_builder.seo_draft_applied",
      targetType: "seo_draft",
      targetId: draft.id,
      metadata: {
        findingId: draft.findingId,
        appliedTo: next.appliedTo,
        pageId: site.id,
        page: builderPageLabel(site),
      },
    });

    revalidateBuilder(session.organizationSlug, site);
    revalidatePath("/app/seo");
    return `Applied to ${builderPageLabel(site)}. The connected existing website was not changed.`;
  });
}

export async function createBuilderPage(formData: FormData): Promise<ActionResult> {
  return runAction("Could not add that page.", async () => {
    const { session, db } = await requireBuilderEditor();
    await requireBuilderPage(db, session.organizationId);

    const existing = await db
      .select({ id: builderSites.id })
      .from(builderSites)
      .where(eq(builderSites.organizationId, session.organizationId));
    if (existing.length >= MAX_BUILDER_PAGES) {
      throw new Error("This website already has the maximum number of pages.");
    }

    const title = z.string().trim().min(1).max(120).parse(formData.get("title"));
    const rawSlug = String(formData.get("slug") ?? "").trim() || suggestPageSlug(title);
    const slug = parsePageSlug(rawSlug);
    const [taken] = await db
      .select({ id: builderSites.id })
      .from(builderSites)
      .where(
        and(
          eq(builderSites.organizationId, session.organizationId),
          eq(builderSites.slug, slug),
        ),
      )
      .limit(1);
    if (taken) {
      throw new Error("That page address is already in use. Choose another.");
    }

    const [brand] = await db
      .select()
      .from(brandSettings)
      .where(eq(brandSettings.organizationId, session.organizationId))
      .limit(1);
    const layout = layoutForNewPage(String(formData.get("templateId") ?? "blank"), {
      businessName: brand?.businessName || session.organizationName || title,
      description: brand?.description ?? "",
      targetCustomers: brand?.targetCustomers ?? "",
    });

    const [page] = await db
      .insert(builderSites)
      .values({
        organizationId: session.organizationId,
        title,
        slug,
        status: "draft",
        theme: layout.theme,
        templateId: layout.templateId,
        createdBy: session.userId,
      })
      .returning();
    if (!page) throw new Error("Could not add that page.");

    await writeBuilderLayout(db, {
      organizationId: session.organizationId,
      siteId: page.id,
      rows: layout.rows,
    });

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "website_builder.page_created",
      targetType: "builder_site",
      targetId: page.id,
      metadata: { slug, templateId: layout.templateId },
    });
    revalidateBuilder(session.organizationSlug, page);
    return "Draft page created. It is not public until you publish.";
  });
}

export async function removeBuilderPage(formData: FormData): Promise<ActionResult> {
  return runAction("Could not remove that page.", async () => {
    const { session, db } = await requireBuilderEditor();
    const page = await requireBuilderPage(db, session.organizationId, formData);
    if (isHomePageSlug(page.slug)) {
      throw new Error("Home cannot be deleted. Unpublish it to hide it.");
    }
    if (page.status === "published") {
      throw new Error("Unpublish this page first, then you can remove it.");
    }

    await db
      .delete(builderSites)
      .where(
        and(
          eq(builderSites.id, page.id),
          eq(builderSites.organizationId, session.organizationId),
        ),
      );

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "website_builder.page_removed",
      targetType: "builder_site",
      targetId: page.id,
      metadata: { slug: page.slug },
    });
    revalidateBuilder(session.organizationSlug, page);
    return "Page removed. The connected existing website was not changed.";
  });
}

export async function saveBuilderChrome(formData: FormData): Promise<ActionResult> {
  return runAction("Could not save the header and footer.", async () => {
    const { session, db } = await requireBuilderEditor();
    const chrome = parseBuilderChrome({
      showHeader: formData.get("showHeader") === "on",
      showFooter: formData.get("showFooter") === "on",
      showPageLinks: formData.get("showPageLinks") === "on",
      headerName: String(formData.get("headerName") ?? "").slice(0, MAX_HEADER_NAME),
      logoUrl: parseChromeLogoUrl(formData.get("logoUrl")),
      footerText: String(formData.get("footerText") ?? "").slice(0, MAX_FOOTER_TEXT),
      headerBackgroundColor: String(formData.get("headerBackgroundColor") ?? ""),
      footerBackgroundColor: String(formData.get("footerBackgroundColor") ?? ""),
    });
    await db
      .insert(builderChrome)
      .values({
        organizationId: session.organizationId,
        ...chrome,
      })
      .onConflictDoUpdate({
        target: builderChrome.organizationId,
        set: {
          ...chrome,
          updatedAt: new Date(),
        },
      });
    revalidateBuilder(session.organizationSlug);
    return "Header and footer saved. They show on every GroovGro page.";
  });
}
