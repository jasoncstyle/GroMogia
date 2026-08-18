import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { assertSameOrganization } from "@/lib/db/tenant";
import {
  displayNameFrom,
  matchExistingContact,
  normalizeEmail,
  normalizePhone,
  type PersonInput,
} from "@/modules/contacts/identity";

export async function findOrCreateContact(
  organizationId: string,
  input: PersonInput,
) {
  const db = getDb();
  if (!db) throw new Error("Database is not configured");

  const email = normalizeEmail(input.email);
  if (email) {
    const existing = await db
      .select()
      .from(contacts)
      .where(
        and(eq(contacts.organizationId, organizationId), eq(contacts.email, email)),
      )
      .limit(1);
    const match = matchExistingContact(
      existing.map((row) => ({
        id: row.id,
        organizationId: row.organizationId,
        email: row.email,
        displayName: row.displayName,
        phone: row.phone,
      })),
      { email },
    );
    if (match) {
      assertSameOrganization(match.organizationId, organizationId);
      const nextName = input.displayName?.trim();
      const nextPhone = normalizePhone(input.phone);
      if (nextName || nextPhone) {
        await db
          .update(contacts)
          .set({
            displayName: nextName || existing[0].displayName,
            phone: nextPhone ?? existing[0].phone,
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, match.id));
      }
      return match.id;
    }
  }

  const id = crypto.randomUUID();
  await db.insert(contacts).values({
    id,
    organizationId,
    displayName: displayNameFrom(input),
    email,
    phone: normalizePhone(input.phone),
  });
  return id;
}
