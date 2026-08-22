"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { prepareMediaUpload, recordMediaAsset } from "@/lib/actions/media";
import {
  isAllowedMediaImageType,
  MAX_MEDIA_BYTES,
  type MediaLibraryItem,
} from "@/lib/media/blob";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MediaUploadControl({
  enabled,
  recent,
  onPicked,
  label = "Upload a photo",
}: {
  enabled: boolean
  recent: MediaLibraryItem[]
  onPicked: (url: string, originalName: string) => void
  label?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function onFile(file: File) {
    if (!isAllowedMediaImageType(file.type)) {
      toast.error("Use a jpg, png, gif, or webp photo.");
      return;
    }
    if (file.size > MAX_MEDIA_BYTES) {
      toast.error("That photo is larger than 6 MB.");
      return;
    }
    setBusy(true);
    try {
      const prepared = new FormData();
      prepared.set("contentType", file.type);
      prepared.set("fileName", file.name);
      const start = await prepareMediaUpload(prepared);
      if (!start.ok || !start.message) {
        toast.error(start.ok ? "Could not start the photo upload." : start.error);
        return;
      }
      const blob = await upload(start.message, file, {
        access: "public",
        handleUploadUrl: "/api/media/upload",
        clientPayload: JSON.stringify({ originalName: file.name }),
      });
      const recorded = new FormData();
      recorded.set("pathname", blob.pathname);
      recorded.set("url", blob.url);
      recorded.set("contentType", file.type);
      recorded.set("byteSize", String(file.size));
      recorded.set("originalName", file.name);
      const saved = await recordMediaAsset(recorded);
      if (!saved.ok) {
        toast.error(saved.error);
        return;
      }
      onPicked(blob.url, file.name);
      router.refresh();
      toast.success("Photo uploaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload that photo.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
        className="sr-only"
        disabled={!enabled || busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onFile(file);
        }}
      />
      {enabled ? (
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Uploading…" : label}
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">
          Photo upload needs Vercel Blob on the gro-mogia project. Until that
          is added, paste a public https:// photo link.
        </p>
      )}
      {recent.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Use a photo already in GroovGro</p>
          <div className="grid grid-cols-4 gap-2">
            {recent.slice(0, 8).map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "overflow-hidden rounded-md border bg-muted",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
                onClick={() => onPicked(item.publicUrl, item.originalName)}
              >
                {/* Uploaded files are on Vercel Blob, not a remote site that blocks Chrome. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.publicUrl}
                  alt={item.originalName || "Uploaded photo"}
                  className="aspect-square w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
