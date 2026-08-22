import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { recordAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { mediaAssets } from "@/lib/db/schema";
import {
  clipOriginalName,
  isAllowedMediaImageType,
  isOrgMediaPathname,
  isVercelBlobImageUrl,
  MAX_MEDIA_BYTES,
} from "@/lib/media/blob";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession } from "@/lib/require-org";

export function revalidateMedia() {
  revalidatePath("/app/media");
  revalidatePath("/app/website-builder");
}

export async function requireMediaEditor() {
  const session = await requireOrgSession();
  if (
    !hasPermission(session.permissions, "manage_website") &&
    !hasPermission(session.permissions, "manage_brand")
  ) {
    throw new Error("You do not have permission to upload photos.");
  }
  if (
    !session.enabledModules.includes("media") &&
    !session.enabledModules.includes("website_builder")
  ) {
    throw new Error("Media library is not turned on for this organization.");
  }
  const db = getDb();
  if (!db) throw new Error("Database is not configured");
  return { session, db };
}

export async function saveUploadedMedia(input: {
  pathname: string
  url: string
  contentType: string
  byteSize: number
  originalName: string
  organizationId?: string
  userId?: string
}) {
  const { session, db } = input.organizationId
    ? { session: { organizationId: input.organizationId, userId: input.userId }, db: getDb() }
    : await requireMediaEditor();
  if (!db) throw new Error("Database is not configured");
  if (!session.organizationId) throw new Error("Sign in first.");
  if (!isOrgMediaPathname(session.organizationId, input.pathname)) {
    throw new Error("That photo does not belong to this organization.");
  }
  if (!isVercelBlobImageUrl(input.url)) {
    throw new Error("That photo address is not a GroovGro upload.");
  }
  if (!isAllowedMediaImageType(input.contentType)) {
    throw new Error("Use a jpg, png, gif, or webp photo.");
  }
  const byteSize = Number.isFinite(input.byteSize) ? Math.round(input.byteSize) : 0;
  if (byteSize > MAX_MEDIA_BYTES) {
    throw new Error("That photo is too large.");
  }

  const [existing] = await db
    .select()
    .from(mediaAssets)
    .where(
      and(
        eq(mediaAssets.organizationId, session.organizationId),
        eq(mediaAssets.blobPathname, input.pathname),
      ),
    )
    .limit(1);
  if (existing) {
    return { publicUrl: existing.publicUrl || input.url, originalName: existing.originalName };
  }

  const originalName = clipOriginalName(input.originalName);
  await db.insert(mediaAssets).values({
    organizationId: session.organizationId,
    blobPathname: input.pathname,
    publicUrl: input.url,
    originalName,
    contentType: input.contentType.split(";")[0]?.trim().toLowerCase() ?? "image/jpeg",
    byteSize,
    kind: "image",
    createdBy: session.userId ?? null,
  });

  if (session.userId) {
    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "media.uploaded",
      targetType: "media_asset",
      metadata: { pathname: input.pathname },
    });
  }
  revalidateMedia();
  return { publicUrl: input.url, originalName };
}
