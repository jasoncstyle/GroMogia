"use client";

import { useMemo, useState } from "react";

import { CopyLink } from "@/components/copy-link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { namedLeadFormUrl } from "@/lib/marketing/named-link";

export function NamedLeadFormLink({ baseUrl }: { baseUrl: string }) {
  const [source, setSource] = useState("");
  const [campaign, setCampaign] = useState("");
  const url = useMemo(
    () => namedLeadFormUrl(baseUrl, source, campaign),
    [baseUrl, source, campaign],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="utm-source">Where you will share this</Label>
          <Input
            id="utm-source"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder="instagram"
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="utm-campaign">Name for this share</Label>
          <Input
            id="utm-campaign"
            value={campaign}
            onChange={(event) => setCampaign(event.target.value)}
            placeholder="spring-open-house"
            autoComplete="off"
          />
        </div>
      </div>
      <CopyLink key={url} url={url} />
    </div>
  );
}
