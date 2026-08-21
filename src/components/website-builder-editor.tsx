"use client";

import { useState } from "react";

import { BuilderStudio } from "@/components/builder-studio";
import { BuilderThemeFields } from "@/components/builder-color-field";
import { BuilderTemplatePicker } from "@/components/builder-template-picker";
import { CopyLink } from "@/components/copy-link";
import { FoldableSample } from "@/components/foldable-sample";
import { SaveButton, SaveForm } from "@/components/save-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  applyBuilderTemplate,
  publishBuilderSite,
  saveBuilderSite,
  unpublishBuilderSite,
} from "@/lib/actions/website-builder";
import { rowGridTemplate } from "@/lib/website-builder/layout";
import { builderSectionLabel } from "@/lib/website-builder/sections";
import { EMPTY_BUILDER_THEME, parseBuilderTheme, type BuilderTheme } from "@/lib/website-builder/style";
import type { BuilderLayoutRow } from "@/lib/website-builder/types";
import { cn } from "@/lib/utils";

export function WebsiteBuilderEditor({
  site,
  rows,
  brandName,
  publicUrl,
  orgSlug,
}: {
  site: {
    title: string
    metaDescription: string
    status: string
    theme?: BuilderTheme
  }
  rows: BuilderLayoutRow[]
  brandName: string | null
  orgSlug: string
  publicUrl: string
}) {
  const [studioOpen, setStudioOpen] = useState(true);
  const [theme, setTheme] = useState(() => parseBuilderTheme(site.theme ?? EMPTY_BUILDER_THEME));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
          <Button
            type="button"
            size="lg"
            className="h-11 shrink-0 px-5 text-base"
            onClick={() => setStudioOpen(true)}
          >
            Open page editor
          </Button>
          <Button type="button" size="lg" variant="outline" className="h-11 px-5 text-base" asChild>
            <a href="/app/website-builder/preview" target="_blank" rel="noreferrer">
              Preview
            </a>
          </Button>
        <p className="text-sm text-muted-foreground">
          The editor covers this screen so you can add rows and columns. Close
          it to change the page title or search description.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{site.status === "published" ? "Published" : "Draft"}</CardTitle>
          <CardDescription>
            Page title and search text live here. Layout happens in the page
            editor, which covers the rest of GroovGro so you can see the rows
            and columns. This GroovGro page does not replace the connected
            website.
            {brandName ? ` Starter copy comes from Brand (${brandName}).` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {publicUrl ? <CopyLink url={publicUrl} openLabel="Open page" /> : null}
          <SaveForm
            action={saveBuilderSite}
            successMessage="Website details saved."
            className="space-y-3"
          >
            <div className="space-y-2">
              <Label htmlFor="title">Page title</Label>
              <Input id="title" name="title" defaultValue={site.title} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metaDescription">Search description</Label>
              <Textarea
                id="metaDescription"
                name="metaDescription"
                defaultValue={site.metaDescription}
                rows={3}
                maxLength={160}
              />
            </div>
            <SaveButton>Save details</SaveButton>
          </SaveForm>
          <SaveForm
            action={saveBuilderSite}
            successMessage="Page colors saved."
            className="space-y-3"
          >
            <input type="hidden" name="title" value={site.title} />
            <input type="hidden" name="metaDescription" value={site.metaDescription} />
            <p className="text-sm font-medium">Page colors</p>
            <BuilderThemeFields theme={theme} onChange={setTheme} />
            <SaveButton variant="outline">Save colors</SaveButton>
          </SaveForm>
          <div className="flex flex-wrap gap-2">
            {site.status === "published" ? (
              <SaveForm action={unpublishBuilderSite} successMessage="Unpublished.">
                <SaveButton variant="outline">Unpublish</SaveButton>
              </SaveForm>
            ) : (
              <SaveForm action={publishBuilderSite} successMessage="Published.">
                <SaveButton>Publish</SaveButton>
              </SaveForm>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Page layout</CardTitle>
          <CardDescription>
            Open the editor to add a row, set how wide it is on the screen,
            pick how many columns it has, then click a box to change text or
            images in a window.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No rows yet. Open the page editor and click Add a row.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setStudioOpen(true)}
              className="block w-full rounded-xl border p-3 text-left hover:bg-muted/40"
            >
              <span className="mb-2 block text-xs font-medium text-muted-foreground">
                Current layout — click to edit
              </span>
              <div className="space-y-2">
                {rows.map((row, rowIndex) => (
                  <div
                    key={row.id}
                    className={cn(
                      "grid grid-cols-1 gap-1",
                      row.columnWidths.length > 1 &&
                        "md:[grid-template-columns:var(--builder-cols)]",
                    )}
                    style={
                      row.columnWidths.length > 1
                        ? ({ "--builder-cols": rowGridTemplate(row.columnWidths) } as {
                            [key: string]: string
                          })
                        : undefined
                    }
                  >
                    {row.columnWidths.map((_, columnIndex) => {
                      const labels = row.widgets
                        .filter((widget) => widget.columnIndex === columnIndex)
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((widget) => builderSectionLabel(widget.type));
                      return (
                        <div
                          key={`${row.id}-${columnIndex}`}
                          className="min-h-10 rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground"
                        >
                          {rowIndex === 0 && columnIndex === 0 ? (
                            <span className="sr-only">Row {rowIndex + 1}</span>
                          ) : null}
                          {labels.length > 0 ? labels.join(", ") : "Empty"}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Start from a different template</CardTitle>
          <CardDescription>
            This replaces the GroovGro page with a new row-and-column layout.
            It does not change the connected existing website.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FoldableSample
            title="Replace current layout"
            subtitle="Closed until you choose a layout"
          >
            <SaveForm
              action={applyBuilderTemplate}
              successMessage="Template applied to the GroovGro page."
              className="space-y-4"
            >
              <BuilderTemplatePicker />
              <SaveButton variant="outline">Use this template</SaveButton>
            </SaveForm>
          </FoldableSample>
        </CardContent>
      </Card>

      <BuilderStudio
        open={studioOpen}
        onClose={() => setStudioOpen(false)}
        site={{
          title: site.title,
          metaDescription: site.metaDescription,
          status: site.status,
          theme,
        }}
        rows={rows}
        orgSlug={orgSlug}
        onThemeChange={setTheme}
      />
    </div>
  );
}
