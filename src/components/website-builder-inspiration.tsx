"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { draftInspiredBuilderSite } from "@/lib/actions/website-builder";
import { SaveButton, SaveForm } from "@/components/save-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DRAFT_KEY = "groovgro.builderInspiration";

type InspirationFields = {
  businessType: string
  layoutUrl1: string
  layoutUrl2: string
  layoutUrl3: string
  copyUrl1: string
  copyUrl2: string
  copyUrl3: string
  copyUrl4: string
  copyUrl5: string
};

function emptyFields(businessType: string): InspirationFields {
  return {
    businessType,
    layoutUrl1: "",
    layoutUrl2: "",
    layoutUrl3: "",
    copyUrl1: "",
    copyUrl2: "",
    copyUrl3: "",
    copyUrl4: "",
    copyUrl5: "",
  };
}

function readDraft(businessType: string): InspirationFields {
  const fallback = emptyFields(businessType);
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return fallback;
    const saved = JSON.parse(raw) as Partial<InspirationFields>;
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
}: {
  businessType: string
  disabled?: boolean
  hasExistingHome?: boolean
}) {
  const router = useRouter();
  const [fields, setFields] = useState(() => emptyFields(businessType));

  useEffect(() => {
    setFields(readDraft(businessType));
  }, [businessType]);

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
        window.sessionStorage.removeItem(DRAFT_KEY);
        router.replace("/app/website-builder?restarted=1");
        router.refresh();
      }}
    >
      <p className="text-sm text-muted-foreground">
        Search the web for something like “inspirational website design” or
        “[your kind of business] website.” Open pages you like. Paste the
        public addresses below. GroovGro reads those public pages for layout
        and topics. It does not copy the site, steal photos, or change any
        live website. This can take up to a minute.
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
          Paste up to five public pages. GroovGro uses headings as labels. You
          still write the sentences.
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
