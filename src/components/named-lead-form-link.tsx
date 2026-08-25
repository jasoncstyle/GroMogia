"use client";

import { useMemo, useState } from "react";

import { CopyLink } from "@/components/copy-link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { namedLeadFormUrl } from "@/lib/marketing/named-link";

export function NamedLeadFormLink({
  baseUrl,
  idPrefix = "utm",
  openLabel = "Open form",
}: {
  baseUrl: string
  idPrefix?: string
  openLabel?: string
}) {
  const [source, setSource] = useState("");
  const [campaign, setCampaign] = useState("");
  const url = useMemo(
    () => namedLeadFormUrl(baseUrl, source, campaign),
    [baseUrl, source, campaign],
  );
  const sourceId = `${idPrefix}-source`;
  const campaignId = `${idPrefix}-campaign`;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={sourceId}>Where you will share this</Label>
          <Input
            id={sourceId}
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder="instagram"
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={campaignId}>Name for this share</Label>
          <Input
            id={campaignId}
            value={campaign}
            onChange={(event) => setCampaign(event.target.value)}
            placeholder="spring-open-house"
            autoComplete="off"
          />
        </div>
      </div>
      <CopyLink key={url} url={url} openLabel={openLabel} />
    </div>
  );
}
