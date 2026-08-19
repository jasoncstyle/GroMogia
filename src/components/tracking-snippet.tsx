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
        <li>
          Open the existing website&apos;s host in another tab (often SiteGround
          Site Tools → File Manager). Leave this GroMogia page open.
        </li>
        <li>
          Open the HTML or layout file that appears on every page. This is often{" "}
          <code className="text-foreground">index.html</code>, a footer file, or
          a header/footer &quot;custom code&quot; box.
        </li>
        <li>
          Paste the snippet just above{" "}
          <code className="text-foreground">&lt;/body&gt;</code>, then save.
        </li>
        <li>
          Open the public website in a new tab, then come back to GroMogia{" "}
          <span className="text-foreground">Analytics</span>. A visit should
          appear within a minute.
        </li>
      </ol>
      <p className="text-sm text-muted-foreground">
        Skip WordPress steps. This test site is not WordPress. If a later site
        is WordPress, we will add those steps then.
      </p>

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
