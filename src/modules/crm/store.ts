import { and, eq, isNull } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  customers,
  leadActivities,
  leadRecords,
  leadStages,
} from "@/lib/db/schema";
import { assertSameOrganization } from "@/lib/db/tenant";

export async function ensureCustomer(
  organizationId: string,
  contactId: string,
  marketingSource?: string | null,
) {
  const db = getDb();
  if (!db) throw new Error("Database is not configured");

  const existing = await db
    .select()
    .from(customers)
    .where(eq(customers.contactId, contactId))
    .limit(1);
  if (existing[0]) {
    assertSameOrganization(existing[0].organizationId, organizationId);
    return existing[0].id;
  }

  const id = crypto.randomUUID();
  await db.insert(customers).values({
    id,
    organizationId,
    contactId,
    marketingSource: marketingSource ?? null,
  });
  return id;
}

export async function addCustomerLtv(contactId: string, amountCents: number) {
  const db = getDb();
  if (!db) return;
  const existing = await db
    .select()
    .from(customers)
    .where(eq(customers.contactId, contactId))
    .limit(1);
  if (!existing[0] || amountCents === 0) return;
  await db
    .update(customers)
    .set({ ltvCents: existing[0].ltvCents + amountCents })
    .where(eq(customers.id, existing[0].id));
}

export async function markOpenLeadsWon(
  organizationId: string,
  contactId: string,
) {
  const db = getDb();
  if (!db) return;

  const won = await db
    .select()
    .from(leadStages)
    .where(
      and(eq(leadStages.organizationId, organizationId), eq(leadStages.key, "won")),
    )
    .limit(1);
  if (!won[0]) return;

  const openLeads = await db
    .select()
    .from(leadRecords)
    .where(
      and(
        eq(leadRecords.organizationId, organizationId),
        eq(leadRecords.contactId, contactId),
        isNull(leadRecords.convertedAt),
      ),
    );

  for (const lead of openLeads) {
    await db
      .update(leadRecords)
      .set({
        stageId: won[0].id,
        convertedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(leadRecords.id, lead.id));
    await db.insert(leadActivities).values({
      organizationId,
      leadId: lead.id,
      type: "converted",
      body: "Converted to customer from a payment or manual conversion.",
    });
  }
}
