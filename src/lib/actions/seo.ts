"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import {
  brandSettings,
  brandVoiceProfiles,
  builderSites,
  seoAudits,
  seoDrafts,
  websites,
} from "@/lib/db/schema";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession } from "@/lib/require-org";
import { auditConnectedPage, isSafePublicHttpUrl } from "@/lib/seo/audit";
import { buildSeoChangeDrafts } from "@/lib/seo/drafts";
import { fetchPublicText, originFromWebsiteUrl } from "@/lib/seo/fetch";
import { builderApplyHint } from "@/lib/website-builder/apply-seo";

function revalidateSeo() {
  revalidatePath("/app/seo");
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

export async function createSeoDrafts(): Promise<ActionResult> {
  return runAction("Could not draft SEO changes.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "manage_seo")) {
      throw new Error("You do not have permission to draft SEO changes.");
    }

    const db = getDb();
    if (!db) throw new Error("Database is not configured");

    const [audit] = await db
      .select()
      .from(seoAudits)
      .where(eq(seoAudits.organizationId, session.organizationId))
      .orderBy(desc(seoAudits.createdAt))
      .limit(1);
    if (!audit) {
      throw new Error("Run a homepage check first, then draft improvements.");
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
    const [builderSite] = await db
      .select({ id: builderSites.id })
      .from(builderSites)
      .where(eq(builderSites.organizationId, session.organizationId))
      .limit(1);

    const drafts = buildSeoChangeDrafts(audit.findings, {
      pageUrl: audit.url,
      businessName: brand?.businessName || session.organizationName || "",
      description: brand?.description ?? "",
      tone: voice?.tone ?? "",
      doSay: voice?.doSay ?? "",
      dontSay: voice?.dontSay ?? "",
    });
    if (drafts.length === 0) {
      throw new Error("The latest check has nothing that needs a draft.");
    }

    await db
      .delete(seoDrafts)
      .where(
        and(
          eq(seoDrafts.organizationId, session.organizationId),
          eq(seoDrafts.status, "draft"),
        ),
      );

    for (const draft of drafts) {
      await db.insert(seoDrafts).values({
        organizationId: session.organizationId,
        auditId: audit.id,
        findingId: draft.findingId,
        title: draft.title,
        proposedChange: draft.proposedChange,
        howToApply: builderSite
          ? `${draft.howToApply}\n${builderApplyHint(draft.findingId)}`
          : draft.howToApply,
        status: "draft",
        createdBy: session.userId,
      });
    }

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "seo.drafts_created",
      targetType: "seo_draft",
      metadata: { count: drafts.length, auditId: audit.id },
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
