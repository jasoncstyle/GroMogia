"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { leadActivities, leadRecords, leadStages } from "@/lib/db/schema";
import { dollarsToCents } from "@/lib/money";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession } from "@/lib/require-org";
import { findOrCreateContact } from "@/modules/contacts/store";
import { ensureCustomer, markOpenLeadsWon } from "@/modules/crm/store";

const contactSchema = z.object({
  displayName: z.string().trim().max(160).optional().default(""),
  email: z.union([z.literal(""), z.string().trim().email()]),
  phone: z.string().trim().max(40).optional().default(""),
  source: z.string().trim().max(80).optional().default("manual"),
  notes: z.string().trim().max(2000).optional().default(""),
  estimatedValue: z.string().optional().default(""),
});

export async function createLead(formData: FormData) {
  const session = await requireOrgSession();
  if (!hasPermission(session.permissions, "manage_leads")) {
    throw new Error("You do not have permission to manage leads.");
  }

  const parsed = contactSchema.parse({
    displayName: formData.get("displayName") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    source: formData.get("source") ?? "manual",
    notes: formData.get("notes") ?? "",
    estimatedValue: formData.get("estimatedValue") ?? "",
  });

  if (!parsed.displayName && !parsed.email) {
    throw new Error("Add a name or an email so GroMogia can identify this person.");
  }

  const db = getDb();
  if (!db) throw new Error("Database is not configured");

  const contactId = await findOrCreateContact(session.organizationId, {
    displayName: parsed.displayName,
    email: parsed.email || null,
    phone: parsed.phone,
  });

  const newStage = await db
    .select()
    .from(leadStages)
    .where(
      and(
        eq(leadStages.organizationId, session.organizationId),
        eq(leadStages.key, "new"),
      ),
    )
    .limit(1);
  if (!newStage[0]) {
    throw new Error("Lead stages are missing. Reload the app and try again.");
  }

  const leadId = crypto.randomUUID();
  await db.insert(leadRecords).values({
    id: leadId,
    organizationId: session.organizationId,
    contactId,
    stageId: newStage[0].id,
    source: parsed.source || "manual",
    notes: parsed.notes,
    estimatedValueCents: parsed.estimatedValue
      ? dollarsToCents(parsed.estimatedValue)
      : null,
  });
  await db.insert(leadActivities).values({
    organizationId: session.organizationId,
    leadId,
    type: "created",
    body: "Lead created in GroMogia.",
    actorUserId: session.userId,
  });

  await recordAudit({
    organizationId: session.organizationId,
    actorUserId: session.userId,
    action: "lead.created",
    targetType: "lead_record",
    targetId: leadId,
  });

  revalidatePath("/app/crm");
  revalidatePath("/app");
}

export async function moveLead(formData: FormData) {
  const session = await requireOrgSession();
  if (!hasPermission(session.permissions, "manage_leads")) {
    throw new Error("You do not have permission to manage leads.");
  }

  const leadId = z.string().uuid().parse(formData.get("leadId"));
  const stageId = z.string().uuid().parse(formData.get("stageId"));

  const db = getDb();
  if (!db) throw new Error("Database is not configured");

  const [lead] = await db
    .select()
    .from(leadRecords)
    .where(
      and(
        eq(leadRecords.id, leadId),
        eq(leadRecords.organizationId, session.organizationId),
      ),
    )
    .limit(1);
  if (!lead) throw new Error("Lead not found.");

  const [stage] = await db
    .select()
    .from(leadStages)
    .where(
      and(
        eq(leadStages.id, stageId),
        eq(leadStages.organizationId, session.organizationId),
      ),
    )
    .limit(1);
  if (!stage) throw new Error("Stage not found.");

  await db
    .update(leadRecords)
    .set({
      stageId: stage.id,
      convertedAt: stage.isWon ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(leadRecords.id, lead.id));

  if (stage.isWon) {
    await ensureCustomer(session.organizationId, lead.contactId, lead.source);
    await markOpenLeadsWon(session.organizationId, lead.contactId);
  }

  await db.insert(leadActivities).values({
    organizationId: session.organizationId,
    leadId: lead.id,
    type: "stage_changed",
    body: `Moved to ${stage.name}.`,
    actorUserId: session.userId,
  });

  revalidatePath("/app/crm");
  revalidatePath("/app");
}

export async function convertLeadToCustomer(formData: FormData) {
  const session = await requireOrgSession();
  if (!hasPermission(session.permissions, "manage_customers")) {
    throw new Error("You do not have permission to manage customers.");
  }

  const leadId = z.string().uuid().parse(formData.get("leadId"));
  const db = getDb();
  if (!db) throw new Error("Database is not configured");

  const [lead] = await db
    .select()
    .from(leadRecords)
    .where(
      and(
        eq(leadRecords.id, leadId),
        eq(leadRecords.organizationId, session.organizationId),
      ),
    )
    .limit(1);
  if (!lead) throw new Error("Lead not found.");

  await ensureCustomer(session.organizationId, lead.contactId, lead.source);
  await markOpenLeadsWon(session.organizationId, lead.contactId);

  await recordAudit({
    organizationId: session.organizationId,
    actorUserId: session.userId,
    action: "lead.converted",
    targetType: "contact",
    targetId: lead.contactId,
  });

  revalidatePath("/app/crm");
  revalidatePath("/app");
}
