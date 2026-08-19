"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      toast.error("Could not copy the link.");
    }
  }

  return (
    <div className="space-y-3">
      <p className="break-all font-mono text-sm">{url}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={copy} aria-label="Copy public lead form link">
          {copied ? "Copied" : "Copy link"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <a href={url} target="_blank" rel="noreferrer">
            Open form
          </a>
        </Button>
      </div>
    </div>
  );
}
