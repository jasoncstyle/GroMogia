"use client";

import { useState } from "react";

import { BuilderColorField } from "@/components/builder-color-field";
import { BuilderRemoteImage } from "@/components/builder-remote-image";
import { MediaUploadControl } from "@/components/media-upload-control";
import { SaveButton, SaveForm } from "@/components/save-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveBuilderChrome } from "@/lib/actions/website-builder";
import type { MediaLibraryItem } from "@/lib/media/blob";
import {
  MAX_FOOTER_TEXT,
  MAX_HEADER_NAME,
  type BuilderChrome,
} from "@/lib/website-builder/chrome";
import { isSafeBuilderImageUrl } from "@/lib/website-builder/sections";
import { BUILDER_BACKGROUND_SWATCHES } from "@/lib/website-builder/style";

export function BuilderChromeFields({
  chrome,
  fallbackName,
  uploadsEnabled,
  recentMedia,
  idPrefix,
  onSaved,
}: {
  chrome: BuilderChrome
  fallbackName: string
  uploadsEnabled: boolean
  recentMedia: MediaLibraryItem[]
  idPrefix: string
  onSaved?: () => void
}) {
  const [logoUrl, setLogoUrl] = useState(chrome.logoUrl);
  const [headerBackgroundColor, setHeaderBackgroundColor] = useState(
    chrome.headerBackgroundColor,
  );
  const [footerBackgroundColor, setFooterBackgroundColor] = useState(
    chrome.footerBackgroundColor,
  );
  const showLogo =
    Boolean(logoUrl) && isSafeBuilderImageUrl(logoUrl) && logoUrl.startsWith("https://");

  return (
    <SaveForm
      action={saveBuilderChrome}
      successMessage="Header and footer saved."
      onSuccess={onSaved}
      className="space-y-4"
    >
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="showHeader"
          defaultChecked={chrome.showHeader}
          className="mt-1"
        />
        <span>Show the header (name, optional logo, and page links)</span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="showPageLinks"
          defaultChecked={chrome.showPageLinks}
          className="mt-1"
        />
        <span>Show links to published GroovGro pages in the header</span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="showFooter"
          defaultChecked={chrome.showFooter}
          className="mt-1"
        />
        <span>Show the footer</span>
      </label>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-headerName`}>Name in the header</Label>
        <Input
          id={`${idPrefix}-headerName`}
          name="headerName"
          defaultValue={chrome.headerName}
          maxLength={MAX_HEADER_NAME}
          placeholder={fallbackName || "Your business"}
        />
        <p className="text-xs text-muted-foreground">
          Leave this blank to use the brand name
          {fallbackName ? ` (${fallbackName})` : ""}.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-logoUrl`}>Logo</Label>
        {showLogo ? (
          <BuilderRemoteImage url={logoUrl} alt="Logo preview" variant="logo" />
        ) : null}
        <MediaUploadControl
          enabled={uploadsEnabled}
          recent={recentMedia}
          label="Upload a logo"
          onPicked={(url) => setLogoUrl(url)}
        />
        <Input
          id={`${idPrefix}-logoUrl`}
          name="logoUrl"
          value={logoUrl}
          placeholder="https://"
          onChange={(event) => setLogoUrl(event.target.value)}
        />
        {logoUrl ? (
          <Button type="button" variant="outline" onClick={() => setLogoUrl("")}>
            Remove logo
          </Button>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Upload a photo, pick one already in GroovGro, or paste a public
          https:// link.             Leave this blank to show only the name.
        </p>
      </div>
      <BuilderColorField
        id={`${idPrefix}-headerBackgroundColor`}
        name="headerBackgroundColor"
        label="Header background"
        value={headerBackgroundColor}
        swatches={BUILDER_BACKGROUND_SWATCHES}
        onChange={setHeaderBackgroundColor}
      />
      <p className="-mt-2 text-xs text-muted-foreground">
        Default (the slashed swatch) means no extra color — the page background
        shows through.
      </p>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-footerText`}>Footer line</Label>
        <Textarea
          id={`${idPrefix}-footerText`}
          name="footerText"
          defaultValue={chrome.footerText}
          rows={2}
          maxLength={MAX_FOOTER_TEXT}
          placeholder={fallbackName || "Your business"}
        />
        <p className="text-xs text-muted-foreground">
          Leave this blank to repeat the header name. Uncheck Show the
          footer if you do not want a line at the bottom.
        </p>
      </div>
      <BuilderColorField
        id={`${idPrefix}-footerBackgroundColor`}
        name="footerBackgroundColor"
        label="Footer background"
        value={footerBackgroundColor}
        swatches={BUILDER_BACKGROUND_SWATCHES}
        onChange={setFooterBackgroundColor}
      />
      <p className="-mt-2 text-xs text-muted-foreground">
        Default (the slashed swatch) means no extra color — the page background
        shows through.
      </p>
      <SaveButton>Save header and footer</SaveButton>
    </SaveForm>
  );
}
