"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { uploadMediaFile } from "@/lib/actions/media";
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
      toast.error("That photo is larger than 4 MB.");
      return;
    }
    setBusy(true);
    try {
      const payload = new FormData();
      payload.set("file", file);
      const saved = await uploadMediaFile(payload);
      if (!saved.ok || !saved.message) {
        toast.error(saved.ok ? "Could not upload that photo." : saved.error);
        return;
      }
      onPicked(saved.message, file.name);
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
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onFile(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => {
          if (!enabled) {
            toast.error(
              "Connect a Public Blob store to gro-mogia, then Redeploy Production.",
            );
            return;
          }
          inputRef.current?.click();
        }}
      >
        {busy ? "Uploading…" : label}
      </Button>
      {enabled ? null : (
        <p className="text-xs text-muted-foreground">
          This live site does not see a Public Blob store yet. On Vercel,
          Storage must show a Public Blob store on Production. Then Redeploy
          Production with the build cache off. You can still paste a https://
          photo link.
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
