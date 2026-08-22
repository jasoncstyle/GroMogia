import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { requireMediaEditor, saveUploadedMedia } from "@/lib/media/store";
import {
  isBlobConfigured,
  isOrgMediaPathname,
  MAX_MEDIA_BYTES,
  MEDIA_IMAGE_TYPES,
} from "@/lib/media/blob";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isBlobConfigured()) {
    return NextResponse.json(
      { error: "Add Vercel Blob to the gro-mogia project first, then redeploy." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const { session } = await requireMediaEditor();
        if (!isOrgMediaPathname(session.organizationId, pathname)) {
          throw new Error("That photo does not belong to this organization.");
        }
        let originalName = "";
        if (clientPayload) {
          try {
            originalName = String(JSON.parse(clientPayload).originalName ?? "");
          } catch {
            originalName = "";
          }
        }
        return {
          allowedContentTypes: [...MEDIA_IMAGE_TYPES],
          maximumSizeInBytes: MAX_MEDIA_BYTES,
          addRandomSuffix: false,
          allowOverwrite: false,
          tokenPayload: JSON.stringify({
            organizationId: session.organizationId,
            userId: session.userId,
            originalName,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        let organizationId = "";
        let userId = "";
        let originalName = "";
        if (tokenPayload) {
          try {
            const parsed = JSON.parse(tokenPayload) as {
              organizationId?: string
              userId?: string
              originalName?: string
            };
            organizationId = parsed.organizationId ?? "";
            userId = parsed.userId ?? "";
            originalName = parsed.originalName ?? "";
          } catch {
            return;
          }
        }
        if (!organizationId) return;
        await saveUploadedMedia({
          pathname: blob.pathname,
          url: blob.url,
          contentType: blob.contentType,
          byteSize: 0,
          originalName,
          organizationId,
          userId,
        });
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not upload that photo.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
