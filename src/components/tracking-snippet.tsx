"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function TrackingSnippet({
  snippet,
  leadFormUrl,
}: {
  snippet: string
  leadFormUrl: string
}) {
  const [copied, setCopied] = useState(false);

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-4">
      <textarea
        readOnly
        className="min-h-24 w-full rounded-lg border bg-muted/40 p-3 font-mono text-xs"
        value={snippet}
      />
      <Button type="button" onClick={copySnippet}>
        {copied ? "Copied" : "Copy snippet"}
      </Button>

      <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
        <li>Click Copy snippet.</li>
        <li>Open the existing website&apos;s admin in another tab. Leave this GroMogia page open.</li>
        <li>
          <span className="text-foreground">WordPress:</span> go to{" "}
          <span className="text-foreground">Appearance → Theme File Editor → footer.php</span>.
          Paste the snippet just above <code className="text-foreground">&lt;/body&gt;</code>, then
          click Update File.
        </li>
        <li>
          <span className="text-foreground">If you cannot find footer.php:</span> in WordPress go to{" "}
          <span className="text-foreground">Plugins → Add New</span>, install{" "}
          <span className="text-foreground">WPCode</span>, add a Footer snippet, paste, and save.
        </li>
        <li>
          Open the public website in a new tab, then come back to GroMogia{" "}
          <span className="text-foreground">Analytics</span>. A visit should appear within a minute.
        </li>
      </ol>

      <p className="text-sm text-muted-foreground">
        This does not replace the current site. It only records visits. It never stores card
        numbers.
      </p>

      {leadFormUrl ? (
        <p className="text-sm text-muted-foreground">
          Public lead form (share this link, or add it as a button on the site):{" "}
          <a className="text-foreground underline" href={leadFormUrl}>
            {leadFormUrl}
          </a>
        </p>
      ) : null}
    </div>
  );
}
