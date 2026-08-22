"use server";

import { and, eq } from "drizzle-orm";
import { del } from "@vercel/blob";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { mediaAssets } from "@/lib/db/schema";
import {
  isAllowedMediaImageType,
  isBlobConfigured,
  isVercelBlobImageUrl,
  MAX_MEDIA_ASSETS,
  mediaBlobPathname,
} from "@/lib/media/blob";
import { requireMediaEditor, revalidateMedia, saveUploadedMedia } from "@/lib/media/store";

export async function prepareMediaUpload(formData: FormData): Promise<ActionResult> {
  return runAction("Could not start the photo upload.", async () => {
    const { session, db } = await requireMediaEditor();
    if (!isBlobConfigured()) {
      throw new Error("Add Vercel Blob to the gro-mogia project first, then redeploy.");
    }
    const existing = await db
      .select({ id: mediaAssets.id })
      .from(mediaAssets)
      .where(eq(mediaAssets.organizationId, session.organizationId));
    if (existing.length >= MAX_MEDIA_ASSETS) {
      throw new Error("This organization already has the maximum number of photos.");
    }
    const contentType = String(formData.get("contentType") ?? "");
    const fileName = String(formData.get("fileName") ?? "");
    if (!isAllowedMediaImageType(contentType)) {
      throw new Error("Use a jpg, png, gif, or webp photo.");
    }
    return mediaBlobPathname(session.organizationId, contentType, fileName);
  });
}

export async function recordMediaAsset(formData: FormData): Promise<ActionResult> {
  return runAction("Could not save that photo.", async () => {
    const asset = await saveUploadedMedia({
      pathname: String(formData.get("pathname") ?? ""),
      url: String(formData.get("url") ?? ""),
      contentType: String(formData.get("contentType") ?? ""),
      byteSize: Number(formData.get("byteSize") ?? 0),
      originalName: String(formData.get("originalName") ?? ""),
    });
    return asset.publicUrl;
  });
}

export async function removeMediaAsset(formData: FormData): Promise<ActionResult> {
  return runAction("Could not remove that photo.", async () => {
    const { session, db } = await requireMediaEditor();
    const id = String(formData.get("assetId") ?? "");
    const [row] = await db
      .select()
      .from(mediaAssets)
      .where(
        and(eq(mediaAssets.id, id), eq(mediaAssets.organizationId, session.organizationId)),
      )
      .limit(1);
    if (!row) throw new Error("That photo was not found.");
    if (row.publicUrl && isVercelBlobImageUrl(row.publicUrl) && isBlobConfigured()) {
      await del(row.publicUrl);
    }
    await db
      .delete(mediaAssets)
      .where(
        and(eq(mediaAssets.id, row.id), eq(mediaAssets.organizationId, session.organizationId)),
      );
    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "media.removed",
      targetType: "media_asset",
      targetId: row.id,
    });
    revalidateMedia();
    return "Photo removed from GroovGro. Pages that still use it need a new photo.";
  });
}
