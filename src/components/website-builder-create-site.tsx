"use client";

import { useRouter } from "next/navigation";

import { draftOwnedBuilderSite } from "@/lib/actions/website-builder";
import { SaveButton, SaveForm } from "@/components/save-form";

export function WebsiteBuilderCreateSite({
  disabled,
  hasExistingHome = false,
}: {
  disabled?: boolean
  hasExistingHome?: boolean
}) {
  const router = useRouter();
  return (
    <SaveForm
      action={draftOwnedBuilderSite}
      successMessage="Draft website created."
      className="space-y-3"
      onSuccess={() => {
        router.replace("/app/website-builder?created=1");
        router.refresh();
      }}
    >
      <p className="text-sm text-muted-foreground">
        GroovGro drafts a complete unpublished website: Home, About, What we
        offer, Contact, Questions, and Where we work when you have locations.
        Confirmed offers each get their own page. The header links those pages
        together. This does not copy other websites, change your connected live
        site, or touch Stripe.
      </p>
      {hasExistingHome ? (
        <p className="text-sm text-muted-foreground">
          Your current Home is copied to a draft page named Previous Home first.
          Extra pages you already have stay as they are.
        </p>
      ) : null}
      <SaveButton disabled={disabled} pendingLabel="Creating your GroovGro website…">
        Create my GroovGro website
      </SaveButton>
    </SaveForm>
  );
}
