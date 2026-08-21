"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import {
  brandSettings,
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
import { writeBuilderLayout } from "@/lib/website-builder/persist-layout";
import {
  defaultContentForType,
  isBuilderSectionType,
  parseBuilderSectionContent,
  contentFromFormData,
} from "@/lib/website-builder/sections";
import { parseBuilderColor, parseBuilderTheme } from "@/lib/website-builder/style";
import {
  isBuilderTemplateId,
  layoutForTemplate,
} from "@/lib/website-builder/templates";

function revalidateBuilder(organizationSlug?: string | null) {
  revalidatePath("/app/website-builder");
  revalidatePath("/app/website-builder/preview");
  if (organizationSlug) revalidatePath(`/w/${organizationSlug}`);
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

export async function createBuilderSite(formData: FormData): Promise<ActionResult> {
  return runAction("Could not create the GroovGro website.", async () => {
    const { session, db } = await requireBuilderEditor();
    const [existing] = await db
      .select()
      .from(builderSites)
      .where(eq(builderSites.organizationId, session.organizationId))
      .limit(1);
    if (existing) {
      throw new Error("This organization already has a GroovGro website.");
    }

    const templateId = String(formData.get("templateId") ?? "simple");
    const [brand] = await db
      .select()
      .from(brandSettings)
      .where(eq(brandSettings.organizationId, session.organizationId))
      .limit(1);
    const title = brand?.businessName || session.organizationName || "Website";
    await db.insert(builderSites).values({
      organizationId: session.organizationId,
      title,
      status: "draft",
      createdBy: session.userId,
    });
    const [site] = await db
      .select()
      .from(builderSites)
      .where(eq(builderSites.organizationId, session.organizationId))
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
      metadata: { templateId: isBuilderTemplateId(templateId) ? templateId : "simple" },
    });
    revalidateBuilder(session.organizationSlug);
    return "Draft website created. It is not public until you publish.";
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
    const [site] = await db
      .select()
      .from(builderSites)
      .where(eq(builderSites.organizationId, session.organizationId))
      .limit(1);
    if (!site) throw new Error("Create the GroovGro website first.");
    const theme = formData.has("pageBackground")
      ? parseBuilderTheme({
          pageBackground: formData.get("pageBackground"),
          textColor: formData.get("textColor"),
          headingColor: formData.get("headingColor"),
          buttonBackground: formData.get("buttonBackground"),
          buttonText: formData.get("buttonText"),
        })
      : parseBuilderTheme(site.theme);

    await db
      .update(builderSites)
      .set({ title, metaDescription, theme, updatedAt: new Date() })
      .where(
        and(
          eq(builderSites.id, site.id),
          eq(builderSites.organizationId, session.organizationId),
        ),
      );
    revalidateBuilder(session.organizationSlug);
    return "Website details saved.";
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
    const [site] = await db
      .select()
      .from(builderSites)
      .where(eq(builderSites.organizationId, session.organizationId))
      .limit(1);
    if (!site) throw new Error("Create the GroovGro website first.");

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

    const sections = await db
      .select()
      .from(builderSections)
      .where(eq(builderSections.organizationId, session.organizationId))
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
    const [site] = await db
      .select()
      .from(builderSites)
      .where(eq(builderSites.organizationId, session.organizationId))
      .limit(1);
    if (!site) throw new Error("Create the GroovGro website first.");
    const existing = await db
      .select({ sortOrder: builderRows.sortOrder })
      .from(builderRows)
      .where(eq(builderRows.siteId, site.id))
      .orderBy(asc(builderRows.sortOrder));
    await db.insert(builderRows).values({
      organizationId: session.organizationId,
      siteId: site.id,
      sortOrder: (existing.at(-1)?.sortOrder ?? -1) + 1,
      columnWidths: widthsForLayout(layoutId),
    });
    revalidateBuilder(session.organizationSlug);
    return "Row added. Click Add widget in a column.";
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
    const rows = await db
      .select()
      .from(builderRows)
      .where(eq(builderRows.organizationId, session.organizationId))
      .orderBy(asc(builderRows.sortOrder));
    const index = rows.findIndex((row) => row.id === rowId);
    if (index < 0) throw new Error("That row was not found.");
    const swapWith = direction === "up" ? index - 1 : index + 1;
    const current = rows[index];
    const other = rows[swapWith];
    if (!current || !other) return "Row is already at the end.";
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
    revalidateBuilder(session.organizationSlug);
    return "Row layout saved. Columns that no longer exist moved their widgets into the last column.";
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

export async function publishBuilderSite(): Promise<ActionResult> {
  return runAction("Could not publish the website.", async () => {
    const { session, db } = await requireBuilderEditor();
    if (!hasPermission(session.permissions, "publish_website")) {
      throw new Error("You do not have permission to publish the GroovGro website.");
    }
    const [site] = await db
      .select()
      .from(builderSites)
      .where(eq(builderSites.organizationId, session.organizationId))
      .limit(1);
    if (!site) throw new Error("Create the GroovGro website first.");

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

export async function unpublishBuilderSite(): Promise<ActionResult> {
  return runAction("Could not unpublish the website.", async () => {
    const { session, db } = await requireBuilderEditor();
    if (!hasPermission(session.permissions, "publish_website")) {
      throw new Error("You do not have permission to unpublish the GroovGro website.");
    }
    const [site] = await db
      .select()
      .from(builderSites)
      .where(eq(builderSites.organizationId, session.organizationId))
      .limit(1);
    if (!site) throw new Error("Create the GroovGro website first.");

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
    const [site] = await db
      .select()
      .from(builderSites)
      .where(eq(builderSites.organizationId, session.organizationId))
      .limit(1);
    if (!site) throw new Error("Create the GroovGro website first.");

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

    const [site] = await db
      .select()
      .from(builderSites)
      .where(eq(builderSites.organizationId, session.organizationId))
      .limit(1);
    if (!site) {
      throw new Error("Create a GroovGro website first, then apply this draft there.");
    }

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
      metadata: { findingId: draft.findingId, appliedTo: next.appliedTo },
    });

    revalidateBuilder(session.organizationSlug);
    revalidatePath("/app/seo");
    return "Applied to the GroovGro website. The connected existing website was not changed.";
  });
}
