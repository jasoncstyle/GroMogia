"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, isNull } from "drizzle-orm";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import {
  brandSettings,
  brandVoiceProfiles,
  seoAudits,
  seoDrafts,
  websites,
} from "@/lib/db/schema";
import { appUrl } from "@/lib/env";
import { resolveOrganizationSlug } from "@/lib/org";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession } from "@/lib/require-org";
import { auditConnectedPage, isSafePublicHttpUrl } from "@/lib/seo/audit";
import { auditBuilderPage, snapshotBuilderPage } from "@/lib/seo/builder-audit";
import { buildSeoChangeDrafts } from "@/lib/seo/drafts";
import { fetchPublicText, originFromWebsiteUrl } from "@/lib/seo/fetch";
import { builderApplyHint, builderPublicUrl } from "@/lib/website-builder/apply-seo";
import { flattenLayoutWidgets } from "@/lib/website-builder/nest";
import { builderPageLabel } from "@/lib/website-builder/pages";
import { getBuilderEditorData, listBuilderPages } from "@/lib/website-builder/queries";

function revalidateSeo() {
  revalidatePath("/app/seo");
}

async function requireSeoEditor() {
  const session = await requireOrgSession();
  if (!hasPermission(session.permissions, "manage_seo")) {
    throw new Error("You do not have permission to run SEO checks.");
  }
  const db = getDb();
  if (!db) throw new Error("Database is not configured");
  return { session, db };
}

async function checkBuilderPage(
  db: NonNullable<ReturnType<typeof getDb>>,
  session: { organizationId: string; organizationSlug?: string; userId: string },
  pageId: string,
) {
  const data = await getBuilderEditorData(session.organizationId, pageId);
  if (!data.site || data.site.id !== pageId) {
    throw new Error("That GroovGro page was not found.");
  }
  const orgSlug = await resolveOrganizationSlug(
    session.organizationId,
    session.organizationSlug ?? undefined,
  );
  const label = builderPageLabel(data.site);
  const snapshot = snapshotBuilderPage({
    pageLabel: label,
    title: data.site.title,
    metaDescription: data.site.metaDescription,
    published: data.site.status === "published",
    publicUrl: orgSlug
      ? builderPublicUrl(appUrl(), orgSlug, data.site.slug)
      : label,
    widgets: flattenLayoutWidgets(data.rows),
  });
  const result = auditBuilderPage(snapshot);
  await db.insert(seoAudits).values({
    organizationId: session.organizationId,
    url: snapshot.publicUrl,
    status: "ok",
    score: result.score,
    summary: result.summary,
    findings: result.findings,
    builderSiteId: data.site.id,
    createdBy: session.userId,
  });
  return { label, score: result.score };
}

export async function runSeoAudit(): Promise<ActionResult> {
  return runAction("Could not run the SEO check.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "manage_seo")) {
      throw new Error("You do not have permission to run SEO checks.");
    }

    const db = getDb();
    if (!db) throw new Error("Database is not configured");

    const [website] = await db
      .select()
      .from(websites)
      .where(eq(websites.organizationId, session.organizationId))
      .limit(1);
    if (!website?.publicUrl) {
      throw new Error("Connect the existing website first, then run this check.");
    }

    const pageUrl = isSafePublicHttpUrl(website.publicUrl);
    const origin = originFromWebsiteUrl(website.publicUrl);
    if (!pageUrl || !origin) {
      throw new Error("The connected website URL cannot be checked.");
    }

    const page = await fetchPublicText(pageUrl.toString());
    if (!page.ok || !page.body) {
      throw new Error(
        "GroovGro could not read the connected homepage. Check the website URL and try again.",
      );
    }

    const robots = await fetchPublicText(new URL("/robots.txt", origin).toString());
    const sitemapDirect = await fetchPublicText(new URL("/sitemap.xml", origin).toString());
    const sitemapInRobots = robots.ok && /sitemap:\s*https?:\/\//i.test(robots.body);
    const result = auditConnectedPage({
      url: pageUrl.toString(),
      html: page.body,
      robotsText: robots.ok ? robots.body : null,
      sitemapFound: sitemapDirect.ok || sitemapInRobots,
    });

    await db.insert(seoAudits).values({
      organizationId: session.organizationId,
      websiteId: website.id,
      url: pageUrl.toString(),
      status: "ok",
      score: result.score,
      summary: result.summary,
      findings: result.findings,
      createdBy: session.userId,
    });

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "seo.audit_run",
      targetType: "seo_audit",
      metadata: { score: result.score, url: pageUrl.toString() },
    });

    revalidateSeo();
    return `Check saved. Score ${result.score}. GroovGro did not change the website.`;
  });
}

export async function runBuilderSeoAudit(formData: FormData): Promise<ActionResult> {
  return runAction("Could not check that GroovGro page.", async () => {
    const { session, db } = await requireSeoEditor();
    const pageId = String(formData.get("pageId") ?? "");
    if (!pageId) throw new Error("Choose a GroovGro page to check.");
    const result = await checkBuilderPage(db, session, pageId);
    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "seo.builder_audit_run",
      targetType: "builder_site",
      targetId: pageId,
      metadata: { score: result.score, page: result.label },
    });
    revalidateSeo();
    return `Checked ${result.label}. Score ${result.score}. GroovGro did not change the connected website.`;
  });
}

export async function runAllBuilderSeoAudits(): Promise<ActionResult> {
  return runAction("Could not check the GroovGro pages.", async () => {
    const { session, db } = await requireSeoEditor();
    const pages = await listBuilderPages(session.organizationId);
    if (pages.length === 0) {
      throw new Error("Create a GroovGro website first, then check those pages.");
    }
    const scores: string[] = [];
    for (const page of pages) {
      const result = await checkBuilderPage(db, session, page.id);
      scores.push(`${result.label} ${result.score}`);
    }
    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "seo.builder_audit_all",
      targetType: "builder_site",
      metadata: { count: pages.length },
    });
    revalidateSeo();
    return `Checked ${pages.length} GroovGro page${pages.length === 1 ? "" : "s"}: ${scores.join(", ")}. GroovGro did not change the connected website.`;
  });
}

export async function createSeoDrafts(formData?: FormData): Promise<ActionResult> {
  return runAction("Could not draft SEO changes.", async () => {
    const { session, db } = await requireSeoEditor();
    const pageId = formData ? String(formData.get("pageId") ?? "").trim() : "";

    const [audit] = pageId
      ? await db
          .select()
          .from(seoAudits)
          .where(
            and(
              eq(seoAudits.organizationId, session.organizationId),
              eq(seoAudits.builderSiteId, pageId),
            ),
          )
          .orderBy(desc(seoAudits.createdAt))
          .limit(1)
      : await db
          .select()
          .from(seoAudits)
          .where(
            and(
              eq(seoAudits.organizationId, session.organizationId),
              isNull(seoAudits.builderSiteId),
            ),
          )
          .orderBy(desc(seoAudits.createdAt))
          .limit(1);
    if (!audit) {
      throw new Error(
        pageId
          ? "Check that GroovGro page first, then draft improvements."
          : "Run a homepage check first, then draft improvements.",
      );
    }

    const [brand] = await db
      .select()
      .from(brandSettings)
      .where(eq(brandSettings.organizationId, session.organizationId))
      .limit(1);
    const [voice] = await db
      .select()
      .from(brandVoiceProfiles)
      .where(eq(brandVoiceProfiles.organizationId, session.organizationId))
      .limit(1);
    const pages = await listBuilderPages(session.organizationId);
    const page = pageId ? pages.find((item) => item.id === pageId) : null;
    const pageLabel = page?.label ?? "this GroovGro page";

    const drafts = buildSeoChangeDrafts(audit.findings, {
      pageUrl: audit.url,
      businessName: brand?.businessName || session.organizationName || page?.title || "",
      description: brand?.description ?? "",
      tone: voice?.tone ?? "",
      doSay: voice?.doSay ?? "",
      dontSay: voice?.dontSay ?? "",
      target: pageId ? "builder" : "connected",
      pageLabel,
    });
    if (drafts.length === 0) {
      throw new Error("The latest check has nothing that needs a draft.");
    }

    await db
      .delete(seoDrafts)
      .where(
        pageId
          ? and(
              eq(seoDrafts.organizationId, session.organizationId),
              eq(seoDrafts.status, "draft"),
              eq(seoDrafts.builderSiteId, pageId),
            )
          : and(
              eq(seoDrafts.organizationId, session.organizationId),
              eq(seoDrafts.status, "draft"),
              isNull(seoDrafts.builderSiteId),
            ),
      );

    for (const draft of drafts) {
      await db.insert(seoDrafts).values({
        organizationId: session.organizationId,
        auditId: audit.id,
        findingId: draft.findingId,
        title: draft.title,
        proposedChange: draft.proposedChange,
        howToApply: pageId
          ? `${draft.howToApply}\n${builderApplyHint(draft.findingId, pageLabel)}`
          : pages.length > 0
            ? `${draft.howToApply}\n${builderApplyHint(draft.findingId, "Home")}`
            : draft.howToApply,
        status: "draft",
        builderSiteId: pageId || null,
        createdBy: session.userId,
      });
    }

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "seo.drafts_created",
      targetType: "seo_draft",
      metadata: {
        count: drafts.length,
        auditId: audit.id,
        pageId: pageId || null,
      },
    });

    revalidateSeo();
    return `${drafts.length} draft${drafts.length === 1 ? "" : "s"} ready to approve. GroovGro did not change the website.`;
  });
}

export async function decideSeoDraft(formData: FormData): Promise<ActionResult> {
  return runAction("Could not save that decision.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "manage_seo")) {
      throw new Error("You do not have permission to approve SEO drafts.");
    }

    const id = String(formData.get("draftId") ?? "");
    const decision = String(formData.get("decision") ?? "");
    if (!id || (decision !== "approved" && decision !== "rejected")) {
      throw new Error("Choose approve or do not approve.");
    }

    const db = getDb();
    if (!db) throw new Error("Database is not configured");

    const [draft] = await db
      .select()
      .from(seoDrafts)
      .where(
        and(
          eq(seoDrafts.id, id),
          eq(seoDrafts.organizationId, session.organizationId),
        ),
      )
      .limit(1);
    if (!draft) throw new Error("That draft was not found.");
    if (draft.status !== "draft") {
      throw new Error("That draft was already decided.");
    }

    await db
      .update(seoDrafts)
      .set({
        status: decision,
        decidedBy: session.userId,
        decidedAt: new Date(),
      })
      .where(eq(seoDrafts.id, draft.id));

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: decision === "approved" ? "seo.draft_approved" : "seo.draft_rejected",
      targetType: "seo_draft",
      targetId: draft.id,
    });

    revalidateSeo();
    return decision === "approved"
      ? "Approved. You can apply title, description, or heading drafts to a GroovGro website. GroovGro did not change the connected existing website."
      : "Marked as do not approve. GroovGro did not change the website.";
  });
}
