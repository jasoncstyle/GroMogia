"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import { seoAudits, websites } from "@/lib/db/schema";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession } from "@/lib/require-org";
import { auditConnectedPage, isSafePublicHttpUrl } from "@/lib/seo/audit";
import { fetchPublicText, originFromWebsiteUrl } from "@/lib/seo/fetch";

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

    revalidatePath("/app/seo");
    return `Check saved. Score ${result.score}. GroovGro did not change the website.`;
  });
}
