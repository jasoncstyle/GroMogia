"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import {
  brandSettings,
  builderSections,
  builderSites,
} from "@/lib/db/schema";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession } from "@/lib/require-org";
import {
  defaultBuilderSections,
  isBuilderSectionType,
  parseBuilderSectionContent,
} from "@/lib/website-builder/sections";

function revalidateBuilder() {
  revalidatePath("/app/website-builder");
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

export async function createBuilderSite(): Promise<ActionResult> {
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

    const defaults = defaultBuilderSections({
      businessName: brand?.businessName || session.organizationName || "",
      description: brand?.description ?? "",
      targetCustomers: brand?.targetCustomers ?? "",
    });
    for (const section of defaults) {
      await db.insert(builderSections).values({
        organizationId: session.organizationId,
        siteId: site.id,
        type: section.type,
        sortOrder: section.sortOrder,
        visible: section.visible,
        content: section.content,
      });
    }

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "website_builder.created",
      targetType: "builder_site",
      targetId: site.id,
    });
    revalidateBuilder();
    return "Draft website created. It is not public until you publish.";
  });
}

export async function saveBuilderSite(formData: FormData): Promise<ActionResult> {
  return runAction("Could not save the website title.", async () => {
    const { session, db } = await requireBuilderEditor();
    const title = z.string().trim().min(1).max(120).parse(formData.get("title"));
    const [site] = await db
      .select()
      .from(builderSites)
      .where(eq(builderSites.organizationId, session.organizationId))
      .limit(1);
    if (!site) throw new Error("Create the GroovGro website first.");

    await db
      .update(builderSites)
      .set({ title, updatedAt: new Date() })
      .where(
        and(
          eq(builderSites.id, site.id),
          eq(builderSites.organizationId, session.organizationId),
        ),
      );
    revalidateBuilder();
    return "Website title saved.";
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

    const content = parseBuilderSectionContent(section.type, {
      heading: String(formData.get("heading") ?? ""),
      subheading: String(formData.get("subheading") ?? ""),
      body: String(formData.get("body") ?? ""),
      buttonLabel: String(formData.get("buttonLabel") ?? ""),
      buttonHref: String(formData.get("buttonHref") ?? ""),
    });
    const visible = formData.get("visible") === "on";

    await db
      .update(builderSections)
      .set({ content, visible, updatedAt: new Date() })
      .where(eq(builderSections.id, section.id));
    revalidateBuilder();
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

    const existing = await db
      .select({ sortOrder: builderSections.sortOrder })
      .from(builderSections)
      .where(eq(builderSections.siteId, site.id))
      .orderBy(asc(builderSections.sortOrder));
    const nextOrder = (existing.at(-1)?.sortOrder ?? -1) + 1;
    const content = parseBuilderSectionContent(type, {
      heading: type === "hero" ? site.title : "New section",
      body: type === "text" || type === "cta" || type === "lead" ? "Add your copy here." : "",
      buttonLabel: type === "hero" || type === "cta" ? "Get in touch" : "",
      buttonHref: type === "hero" || type === "cta" ? "#lead" : "",
    });

    await db.insert(builderSections).values({
      organizationId: session.organizationId,
      siteId: site.id,
      type,
      sortOrder: nextOrder,
      visible: true,
      content,
    });
    revalidateBuilder();
    return "Section added.";
  });
}

export async function moveBuilderSection(formData: FormData): Promise<ActionResult> {
  return runAction("Could not move that section.", async () => {
    const { session, db } = await requireBuilderEditor();
    const sectionId = String(formData.get("sectionId") ?? "");
    const direction = String(formData.get("direction") ?? "");
    const sections = await db
      .select()
      .from(builderSections)
      .where(eq(builderSections.organizationId, session.organizationId))
      .orderBy(asc(builderSections.sortOrder));
    const index = sections.findIndex((section) => section.id === sectionId);
    if (index < 0) throw new Error("That section was not found.");
    const swapWith = direction === "up" ? index - 1 : index + 1;
    const current = sections[index];
    const other = sections[swapWith];
    if (!current || !other) return "Section is already at the end.";

    await db
      .update(builderSections)
      .set({ sortOrder: other.sortOrder, updatedAt: new Date() })
      .where(eq(builderSections.id, current.id));
    await db
      .update(builderSections)
      .set({ sortOrder: current.sortOrder, updatedAt: new Date() })
      .where(eq(builderSections.id, other.id));
    revalidateBuilder();
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
    revalidateBuilder();
    return "Section removed.";
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
    revalidateBuilder();
    revalidatePath(`/w/${session.organizationSlug ?? ""}`);
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
    revalidateBuilder();
    revalidatePath(`/w/${session.organizationSlug ?? ""}`);
    return "Unpublished. The GroovGro page is hidden. The connected existing website was not changed.";
  });
}
