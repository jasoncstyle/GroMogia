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
  seoDrafts,
} from "@/lib/db/schema";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession } from "@/lib/require-org";
import {
  applyApprovedSeoDraftToBuilderState,
  isBuilderApplyableFinding,
} from "@/lib/website-builder/apply-seo";
import {
  defaultBuilderSections,
  defaultContentForType,
  isBuilderSectionType,
  parseBuilderSectionContent,
} from "@/lib/website-builder/sections";

function revalidateBuilder(organizationSlug?: string | null) {
  revalidatePath("/app/website-builder");
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

    await db
      .update(builderSites)
      .set({ title, metaDescription, updatedAt: new Date() })
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

    const content = parseBuilderSectionContent(section.type, {
      heading: String(formData.get("heading") ?? ""),
      subheading: String(formData.get("subheading") ?? ""),
      body: String(formData.get("body") ?? ""),
      buttonLabel: String(formData.get("buttonLabel") ?? ""),
      buttonHref: String(formData.get("buttonHref") ?? ""),
      imageUrl: String(formData.get("imageUrl") ?? ""),
      imageAlt: String(formData.get("imageAlt") ?? ""),
      items: String(formData.get("items") ?? ""),
    });
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

    const existing = await db
      .select({ sortOrder: builderSections.sortOrder })
      .from(builderSections)
      .where(eq(builderSections.siteId, site.id))
      .orderBy(asc(builderSections.sortOrder));
    const nextOrder = (existing.at(-1)?.sortOrder ?? -1) + 1;
    const content = parseBuilderSectionContent(
      type,
      defaultContentForType(type, site.title),
    );

    await db.insert(builderSections).values({
      organizationId: session.organizationId,
      siteId: site.id,
      type,
      sortOrder: nextOrder,
      visible: true,
      content,
    });
    revalidateBuilder(session.organizationSlug);
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
