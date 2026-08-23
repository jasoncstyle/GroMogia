"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { draftInspiredBuilderSite } from "@/lib/actions/website-builder";
import { SaveButton, SaveForm } from "@/components/save-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  emptyInspirationFields,
  parseInspirationFormFields,
  type InspirationFormFields,
} from "@/lib/website-builder/inspiration";

const DRAFT_KEY = "groovgro.builderInspiration";

type InspirationFields = InspirationFormFields;

function emptyFields(businessType: string): InspirationFields {
  return emptyInspirationFields(businessType);
}

function readDraft(businessType: string): InspirationFields {
  const fallback = emptyFields(businessType);
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return fallback;
    const saved = parseInspirationFormFields(JSON.parse(raw));
    return {
      ...fallback,
      ...saved,
      businessType: saved.businessType || businessType,
    };
  } catch {
    return fallback;
  }
}

function writeDraft(fields: InspirationFields) {
  window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(fields));
}

function UrlField({
  id,
  name,
  label,
  value,
  onChange,
}: {
  id: string
  name: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="https://example.com"
        autoComplete="off"
      />
    </div>
  );
}

export function WebsiteBuilderInspiration({
  businessType,
  disabled,
  hasExistingHome = false,
  savedFields,
}: {
  businessType: string
  disabled?: boolean
  hasExistingHome?: boolean
  savedFields?: InspirationFormFields | null
}) {
  const router = useRouter();
  const [fields, setFields] = useState(() =>
    parseInspirationFormFields({
      ...emptyFields(businessType),
      ...savedFields,
      businessType: savedFields?.businessType || businessType,
    }),
  );

  useEffect(() => {
    const local = readDraft(businessType);
    const localFilled = [
      local.layoutUrl1,
      local.layoutUrl2,
      local.layoutUrl3,
      local.copyUrl1,
      local.copyUrl2,
      local.copyUrl3,
      local.copyUrl4,
      local.copyUrl5,
    ].some(Boolean);
    setFields(
      parseInspirationFormFields({
        ...emptyFields(businessType),
        ...savedFields,
        ...(localFilled ? local : {}),
        businessType:
          (localFilled ? local.businessType : savedFields?.businessType) || businessType,
      }),
    );
  }, [businessType, savedFields]);

  function update<Key extends keyof InspirationFields>(
    key: Key,
    value: InspirationFields[Key],
  ) {
    setFields((current) => {
      const next = { ...current, [key]: value };
      writeDraft(next);
      return next;
    });
  }

  return (
    <SaveForm
      action={draftInspiredBuilderSite}
      successMessage="Draft website created."
      className="space-y-4"
      onSuccess={() => {
        writeDraft(fields);
        router.replace("/app/website-builder?restarted=1");
        router.refresh();
      }}
    >
      <p className="text-sm text-muted-foreground">
        Search the web for something like “inspirational website design” or
        “[your kind of business] website.” Open pages you like. Paste the
        public addresses below. GroovGro uses those pages for layout and
        topic labels only. It writes first-draft sentences from your Brand,
        Business Brain, and confirmed offers — not from another company’s
        words. Edit anything before you publish. This can take up to a
        minute.
      </p>
      {hasExistingHome ? (
        <p className="text-sm text-muted-foreground">
          Your current Home is copied to a draft page named Previous Home.
          The new Home stays unpublished until you publish. Extra pages stay
          as they are.
        </p>
      ) : null}

      <div className="space-y-1">
        <Label htmlFor="businessType">Kind of business</Label>
        <Input
          id="businessType"
          name="businessType"
          value={fields.businessType}
          onChange={(event) => update("businessType", event.target.value)}
          placeholder="What kind of business is this?"
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">
          Three websites you like the layout of
        </legend>
        <UrlField
          id="layoutUrl1"
          name="layoutUrl1"
          label="Layout website 1"
          value={fields.layoutUrl1}
          onChange={(value) => update("layoutUrl1", value)}
        />
        <UrlField
          id="layoutUrl2"
          name="layoutUrl2"
          label="Layout website 2"
          value={fields.layoutUrl2}
          onChange={(value) => update("layoutUrl2", value)}
        />
        <UrlField
          id="layoutUrl3"
          name="layoutUrl3"
          label="Layout website 3"
          value={fields.layoutUrl3}
          onChange={(value) => update("layoutUrl3", value)}
        />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">
          Optional: websites for word and topic ideas
        </legend>
        <p className="text-xs text-muted-foreground">
          Paste up to five public pages. GroovGro uses their headings as
          topic labels, then writes first-draft sentences from your own
          business facts.
        </p>
        <UrlField
          id="copyUrl1"
          name="copyUrl1"
          label="Copy website 1"
          value={fields.copyUrl1}
          onChange={(value) => update("copyUrl1", value)}
        />
        <UrlField
          id="copyUrl2"
          name="copyUrl2"
          label="Copy website 2"
          value={fields.copyUrl2}
          onChange={(value) => update("copyUrl2", value)}
        />
        <UrlField
          id="copyUrl3"
          name="copyUrl3"
          label="Copy website 3"
          value={fields.copyUrl3}
          onChange={(value) => update("copyUrl3", value)}
        />
        <UrlField
          id="copyUrl4"
          name="copyUrl4"
          label="Copy website 4"
          value={fields.copyUrl4}
          onChange={(value) => update("copyUrl4", value)}
        />
        <UrlField
          id="copyUrl5"
          name="copyUrl5"
          label="Copy website 5"
          value={fields.copyUrl5}
          onChange={(value) => update("copyUrl5", value)}
        />
      </fieldset>

      <SaveButton disabled={disabled} pendingLabel="Reading pages…">
        {hasExistingHome ? "Start Home over from these sites" : "Draft my GroovGro site"}
      </SaveButton>
    </SaveForm>
  );
}
