"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { isUnmatchedPaymentCopy } from "@/lib/commerce/match-charge";
import { getDb } from "@/lib/db";
import { bookings, contacts, leadRecords, payments } from "@/lib/db/schema";
import { assertSameOrganization } from "@/lib/db/tenant";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession } from "@/lib/require-org";
import { addCustomerLtv, ensureCustomer, markOpenLeadsWon } from "@/modules/crm/store";

const matchSchema = z.object({
  paymentId: z.string().uuid(),
  contactId: z.string().uuid(),
});

export async function matchPaymentToPerson(
  formData: FormData,
): Promise<ActionResult> {
  return runAction("Could not match this payment to a person.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "manage_customers")) {
      throw new Error("You do not have permission to match payments to people.");
    }

    const parsed = matchSchema.parse({
      paymentId: formData.get("paymentId"),
      contactId: formData.get("contactId"),
    });

    const db = getDb();
    if (!db) throw new Error("Database is not configured");

    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, parsed.paymentId))
      .limit(1);
    if (!payment) throw new Error("That payment is not in this workspace.");
    assertSameOrganization(payment.organizationId, session.organizationId);
    if (!isUnmatchedPaymentCopy(payment)) {
      throw new Error("This payment is already matched to a person.");
    }

    const [person] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, parsed.contactId))
      .limit(1);
    if (!person) throw new Error("That person is not in this workspace.");
    assertSameOrganization(person.organizationId, session.organizationId);

    const [firstLead] = await db
      .select({ source: leadRecords.source })
      .from(leadRecords)
      .where(
        and(
          eq(leadRecords.organizationId, session.organizationId),
          eq(leadRecords.contactId, person.id),
        ),
      )
      .orderBy(asc(leadRecords.createdAt))
      .limit(1);

    await db
      .update(payments)
      .set({ contactId: person.id, updatedAt: new Date() })
      .where(eq(payments.id, payment.id));

    if (payment.bookingId) {
      await db
        .update(bookings)
        .set({ contactId: person.id, updatedAt: new Date() })
        .where(eq(bookings.id, payment.bookingId));
    }

    await ensureCustomer(
      session.organizationId,
      person.id,
      firstLead?.source ?? "stripe",
    );
    if (payment.kind === "charge") {
      await addCustomerLtv(person.id, payment.amountCents);
      await markOpenLeadsWon(session.organizationId, person.id);
    }

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "commerce.matched_payment",
      targetType: "payment",
      targetId: payment.id,
    });

    revalidatePath("/app/commerce");
    revalidatePath("/app/intelligence");
    revalidatePath("/app/next-step");
    revalidatePath("/app/crm");
    revalidatePath("/app/marketing");
    revalidatePath("/app");
    return "Payment matched to a person. GroovGro will not charge a card or change checkout.";
  });
}
