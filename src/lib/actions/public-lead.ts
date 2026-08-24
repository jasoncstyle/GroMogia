"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { attributionTouches, leadActivities, leadRecords, leadStages, organizations } from "@/lib/db/schema";
import { findOrCreateContact } from "@/modules/contacts/store";

const publicLeadSchema = z.object({
  orgSlug: z.string().min(1).max(80),
  displayName: z.string().trim().max(160).optional().default(""),
  email: z.string().trim().email(),
  phone: z.string().trim().max(40).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
  landingPage: z.string().trim().max(500).optional().default(""),
  campaign: z.string().trim().max(120).optional().default(""),
  sessionId: z.string().trim().max(80).optional().default(""),
});

export async function submitPublicLead(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = publicLeadSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    displayName: formData.get("displayName") ?? "",
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    notes: formData.get("notes") ?? "",
    landingPage: formData.get("landingPage") ?? "",
    campaign: formData.get("campaign") ?? "",
    sessionId: formData.get("sessionId") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email so we can get back to you." };
  }

  const db = getDb();
  if (!db) return { ok: false, error: "This form is not connected yet." };

  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, parsed.data.orgSlug))
    .limit(1);
  if (!organization) {
    return { ok: false, error: "This form is no longer available." };
  }

  const contactId = await findOrCreateContact(organization.id, {
    displayName: parsed.data.displayName,
    email: parsed.data.email,
    phone: parsed.data.phone,
  });

  const [newStage] = await db
    .select()
    .from(leadStages)
    .where(
      and(
        eq(leadStages.organizationId, organization.id),
        eq(leadStages.key, "new"),
      ),
    )
    .limit(1);
  if (!newStage) {
    return { ok: false, error: "This business is not ready to receive leads yet." };
  }

  const leadId = crypto.randomUUID();
  await db.insert(leadRecords).values({
    id: leadId,
    organizationId: organization.id,
    contactId,
    stageId: newStage.id,
    source: parsed.data.campaign ? "website_campaign" : "website",
    campaignId: parsed.data.campaign || null,
    landingPage: parsed.data.landingPage || null,
    formId: "public_lead",
    notes: parsed.data.notes,
  });
  await db.insert(leadActivities).values({
    organizationId: organization.id,
    leadId,
    type: "created",
    body: "Lead submitted from the public website form.",
  });
  await db.insert(attributionTouches).values({
    organizationId: organization.id,
    contactId,
    sessionId: parsed.data.sessionId || null,
    channel: parsed.data.campaign ? "campaign" : "website",
    campaignId: parsed.data.campaign || null,
    landingPage: parsed.data.landingPage || null,
    raw: { form: "public_lead" },
  });

  await recordAudit({
    organizationId: organization.id,
    action: "lead.created",
    targetType: "lead_record",
    targetId: leadId,
    metadata: { source: "public_form" },
  });

  revalidatePath("/app/next-step");
  revalidatePath("/app/crm");
  revalidatePath("/app");

  return { ok: true };
}
