import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { builderInspiration } from "@/lib/db/schema";
import {
  emptyInspirationFields,
  parseInspirationFormFields,
  type InspirationFormFields,
} from "@/lib/website-builder/inspiration";

type Db = NonNullable<ReturnType<typeof getDb>>;

export async function loadBuilderInspiration(
  organizationId: string,
): Promise<InspirationFormFields> {
  const db = getDb();
  if (!db) return emptyInspirationFields();
  const [row] = await db
    .select({ fields: builderInspiration.fields })
    .from(builderInspiration)
    .where(eq(builderInspiration.organizationId, organizationId))
    .limit(1);
  return parseInspirationFormFields(row?.fields);
}

export async function saveBuilderInspiration(
  db: Db,
  organizationId: string,
  fields: InspirationFormFields,
) {
  const parsed = parseInspirationFormFields(fields);
  await db
    .insert(builderInspiration)
    .values({
      organizationId,
      fields: parsed,
    })
    .onConflictDoUpdate({
      target: builderInspiration.organizationId,
      set: {
        fields: parsed,
        updatedAt: new Date(),
      },
    });
}
