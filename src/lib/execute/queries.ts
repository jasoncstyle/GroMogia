import { desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { executionRequests } from "@/lib/db/schema";
import {
  executionRequestsToShow,
  type ExecutionView,
} from "@/lib/execute/requests";

export async function getExecutionRequests(
  organizationId: string,
): Promise<ExecutionView[]> {
  const db = getDb();
  if (!db || !organizationId) return [];
  const rows = await db
    .select({
      id: executionRequests.id,
      actionId: executionRequests.actionId,
      title: executionRequests.title,
      note: executionRequests.note,
      createdAt: executionRequests.createdAt,
      organizationId: executionRequests.organizationId,
    })
    .from(executionRequests)
    .where(eq(executionRequests.organizationId, organizationId))
    .orderBy(desc(executionRequests.createdAt));

  return executionRequestsToShow(
    rows.flatMap((row) => {
      if (row.organizationId !== organizationId) return [];
      return [
        {
          id: row.id,
          actionId: row.actionId,
          title: row.title,
          note: row.note,
          createdAt: row.createdAt,
        },
      ];
    }),
  );
}
