import { desc, eq } from "drizzle-orm";

import { getAppSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { auditEvents } from "@/lib/db/schema";
import { OpenNextStepLink } from "@/components/open-next-step-link";

export default async function AuditPage() {
  const session = await getAppSession();
  const db = getDb();
  const events =
    db && session.organizationId
      ? await db
          .select()
          .from(auditEvents)
          .where(eq(auditEvents.organizationId, session.organizationId))
          .orderBy(desc(auditEvents.createdAt))
          .limit(50)
      : [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="text-muted-foreground">
          Important changes are append-only. This becomes essential when AI can
          act later.
        </p>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No audit events yet. Saving brand settings will create the first one.
        </p>
      ) : (
        <ul className="space-y-3">
          {events.map((event) => (
            <li key={event.id} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{event.action}</p>
              <p className="text-muted-foreground">
                {event.targetType}
                {event.targetId ? ` · ${event.targetId}` : ""} ·{" "}
                {event.createdAt.toISOString()}
              </p>
            </li>
          ))}
        </ul>
      )}

      <OpenNextStepLink />
    </div>
  );
}
