"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { submitPublicLead } from "@/lib/actions/public-lead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type State = { ok: true } | { ok: false; error: string } | null;

export function PublicLeadForm({
  orgSlug,
  campaign = "",
  utmSource = "",
  utmCampaign = "",
}: {
  orgSlug: string
  campaign?: string
  utmSource?: string
  utmCampaign?: string
}) {
  const sessionRef = useRef<HTMLInputElement>(null);
  const landingRef = useRef<HTMLInputElement>(null);
  const campaignRef = useRef<HTMLInputElement>(null);
  const utmSourceRef = useRef<HTMLInputElement>(null);
  const utmCampaignRef = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState(
    async (_previous: State, formData: FormData) => {
      const result = await submitPublicLead(formData);
      if (result.ok) toast.success("Message sent");
      else toast.error(result.error);
      return result;
    },
    null,
  );

  useEffect(() => {
    if (landingRef.current) {
      landingRef.current.value = window.location.href;
    }
    try {
      const key = "groovgro_sid";
      let value = window.localStorage.getItem(key) || window.localStorage.getItem("gromogia_sid");
      if (!value) {
        value = window.crypto.randomUUID();
        window.localStorage.setItem(key, value);
      }
      if (sessionRef.current) sessionRef.current.value = value;

      const params = new URLSearchParams(window.location.search);
      const sourceFromUrl = params.get("utm_source") || "";
      const campaignFromUrl = params.get("utm_campaign") || "";
      if (sourceFromUrl) {
        window.localStorage.setItem("groovgro_utm_source", sourceFromUrl);
      }
      if (campaignFromUrl) {
        window.localStorage.setItem("groovgro_utm_campaign", campaignFromUrl);
      }

      if (utmSourceRef.current && !utmSourceRef.current.value) {
        utmSourceRef.current.value =
          window.localStorage.getItem("groovgro_utm_source") || "";
      }
      if (utmCampaignRef.current && !utmCampaignRef.current.value) {
        utmCampaignRef.current.value =
          window.localStorage.getItem("groovgro_utm_campaign") || "";
      }
      if (campaignRef.current && !campaignRef.current.value) {
        campaignRef.current.value =
          window.localStorage.getItem("groovgro_utm_campaign") || "";
      }
    } catch {
      // Tracking session is optional for the form to submit.
    }
  }, []);

  if (state?.ok) {
    return (
      <p className="rounded-lg border bg-card p-4 text-sm">
        Thanks. We received your details and will be in touch.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input ref={campaignRef} type="hidden" name="campaign" defaultValue={campaign} />
      <input ref={utmSourceRef} type="hidden" name="utmSource" defaultValue={utmSource} />
      <input
        ref={utmCampaignRef}
        type="hidden"
        name="utmCampaign"
        defaultValue={utmCampaign}
      />
      <input ref={sessionRef} type="hidden" name="sessionId" defaultValue="" />
      <input ref={landingRef} type="hidden" name="landingPage" defaultValue="" />
      <div className="space-y-2">
        <Label htmlFor="displayName">Name</Label>
        <Input id="displayName" name="displayName" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">How can we help?</Label>
        <Textarea id="notes" name="notes" rows={4} />
      </div>
      {state && !state.ok ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send"}
      </Button>
    </form>
  );
}
