import { getDb } from "@/lib/db";
import { auditEvents } from "@/lib/db/schema";

export async function recordAudit(input: {
  organizationId?: string | null
  actorUserId?: string | null
  action: string
  targetType: string
  targetId?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  const db = getDb();
  if (!db) return;

  await db.insert(auditEvents).values({
    organizationId: input.organizationId ?? null,
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    metadata: input.metadata ?? {},
  });
}
