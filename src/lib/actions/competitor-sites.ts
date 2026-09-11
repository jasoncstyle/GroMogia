"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import {
  businessBrains,
  competitorSites,
  offers,
  websites,
} from "@/lib/db/schema";
import { fetchNamedPublicPage } from "@/lib/growth/page-reader";
import {
  planCompetitorLook,
  planCompetitorSite,
} from "@/lib/growth/competitor-looks";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession } from "@/lib/require-org";
import { explainPublicFetchFailure } from "@/lib/seo/fetch";

const siteSchema = z.object({
  name: z.string().trim().max(200).optional().default(""),
  url: z.string().trim().min(1).max(500),
  note: z.string().trim().max(2000).optional().default(""),
});

const lookSchema = z.object({
  siteId: z.string().uuid(),
  pageText: z.string().trim().max(20_000).optional().default(""),
});

function revalidateCompetitorSites() {
  revalidatePath("/app/seo");
  revalidatePath("/app/intelligence");
  revalidatePath("/app/next-step");
  revalidatePath("/app/business");
  revalidatePath("/app");
}

export async function createCompetitorSite(
  formData: FormData,
): Promise<ActionResult> {
  return runAction("Could not save that competitor website.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "manage_seo")) {
      throw new Error("You do not have permission to save competitor websites.");
    }
    const parsed = siteSchema.parse({
      name: formData.get("name") ?? "",
      url: formData.get("url") ?? "",
      note: formData.get("note") ?? "",
    });
    const db = getDb();
    if (!db) throw new Error("Database is not configured");
    const [website] = await db
      .select({ publicUrl: websites.publicUrl })
      .from(websites)
      .where(eq(websites.organizationId, session.organizationId))
      .limit(1);
    let ownHost = "";
    try {
      if (website?.publicUrl) ownHost = new URL(website.publicUrl).hostname;
    } catch {
      ownHost = "";
    }
    const draft = planCompetitorSite({
      organizationId: session.organizationId,
      name: parsed.name,
      url: parsed.url,
      note: parsed.note,
      ownHost,
    });
    const now = new Date();
    const [row] = await db
      .insert(competitorSites)
      .values({
        organizationId: session.organizationId,
        name: draft.name,
        url: draft.url,
        host: draft.host,
        note: draft.note,
        status: draft.status,
        source: draft.source,
        createdBy: session.userId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [competitorSites.organizationId, competitorSites.host],
        set: {
          name: draft.name,
          url: draft.url,
          note: draft.note,
          source: draft.source,
          updatedAt: now,
        },
      })
      .returning({ id: competitorSites.id });
    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "competitor_site.saved",
      targetType: "competitor_site",
      targetId: row?.id ?? session.organizationId,
    });
    revalidateCompetitorSites();
    return "Competitor website saved. GroovGro has not searched Google.";
  });
}

export async function lookAtCompetitorSite(
  formData: FormData,
): Promise<ActionResult> {
  return runAction("Could not read that competitor website.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "manage_seo")) {
      throw new Error("You do not have permission to read competitor websites.");
    }
    const parsed = lookSchema.parse({
      siteId: formData.get("siteId") ?? "",
      pageText: formData.get("pageText") ?? "",
    });
    const db = getDb();
    if (!db) throw new Error("Database is not configured");
    const [site] = await db
      .select({
        id: competitorSites.id,
        name: competitorSites.name,
        url: competitorSites.url,
        organizationId: competitorSites.organizationId,
      })
      .from(competitorSites)
      .where(
        and(
          eq(competitorSites.id, parsed.siteId),
          eq(competitorSites.organizationId, session.organizationId),
        ),
      )
      .limit(1);
    if (!site || site.organizationId !== session.organizationId) {
      throw new Error("Pick a saved competitor website first.");
    }
    const pasted = parsed.pageText.trim();
    const fetched = pasted
      ? { ok: true, status: 200, body: pasted }
      : await fetchNamedPublicPage(site.url);
    if (!fetched.ok || !fetched.body.trim()) {
      throw new Error(explainPublicFetchFailure(fetched));
    }
    const [brain] = await db
      .select({
        differentiators: businessBrains.differentiators,
      })
      .from(businessBrains)
      .where(eq(businessBrains.organizationId, session.organizationId))
      .limit(1);
    const offerRows = await db
      .select({ name: offers.name })
      .from(offers)
      .where(eq(offers.organizationId, session.organizationId));
    const look = planCompetitorLook({
      name: site.name,
      url: site.url,
      html: fetched.body,
      ourOffers: offerRows.map((row) => row.name),
      ourDifference: brain?.differentiators ?? [],
    });
    const now = new Date();
    await db
      .update(competitorSites)
      .set({
        title: look.title,
        description: look.description,
        headings: look.headings,
        navLabels: look.navLabels,
        modelGuess: look.modelGuess,
        marketingGuess: look.marketingGuess,
        competeNote: look.competeNote,
        status: look.status,
        lookedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(competitorSites.id, site.id),
          eq(competitorSites.organizationId, session.organizationId),
        ),
      );
    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "competitor_site.looked",
      targetType: "competitor_site",
      targetId: site.id,
    });
    revalidateCompetitorSites();
    return "Competitor look saved. GroovGro did not copy their words, buy ads, or search Google.";
  });
}
