import { desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { mediaAssets } from "@/lib/db/schema";
import { MAX_MEDIA_ASSETS, type MediaLibraryItem } from "@/lib/media/blob";

export async function listMediaLibrary(
  organizationId: string,
  limit = 24,
): Promise<MediaLibraryItem[]> {
  const db = getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: mediaAssets.id,
      publicUrl: mediaAssets.publicUrl,
      originalName: mediaAssets.originalName,
      createdAt: mediaAssets.createdAt,
    })
    .from(mediaAssets)
    .where(eq(mediaAssets.organizationId, organizationId))
    .orderBy(desc(mediaAssets.createdAt))
    .limit(Math.min(limit, MAX_MEDIA_ASSETS));
  return rows.filter((row) => row.publicUrl);
}
