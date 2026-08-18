"use client";

import { useActionState, useEffect, useRef } from "react";

import { submitPublicLead } from "@/lib/actions/public-lead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type State = { ok: true } | { ok: false; error: string } | null;

export function PublicLeadForm({
  orgSlug,
  campaign,
}: {
  orgSlug: string
  campaign: string
}) {
  const sessionRef = useRef<HTMLInputElement>(null);
  const landingRef = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState(
    async (_previous: State, formData: FormData) => submitPublicLead(formData),
    null,
  );

  useEffect(() => {
    if (landingRef.current) {
      landingRef.current.value = window.location.href;
    }
    try {
      const key = "gromogia_sid";
      let value = window.localStorage.getItem(key);
      if (!value) {
        value = window.crypto.randomUUID();
        window.localStorage.setItem(key, value);
      }
      if (sessionRef.current) sessionRef.current.value = value;
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
      <input type="hidden" name="campaign" value={campaign} />
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
