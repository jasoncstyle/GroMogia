"use client";

import { useMemo, useState } from "react";

import { SaveButton, SaveForm } from "@/components/save-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBuilderPage, removeBuilderPage } from "@/lib/actions/website-builder";
import { BLANK_PAGE_TEMPLATE_ID, suggestPageSlug } from "@/lib/website-builder/pages";
import { BUILDER_TEMPLATES } from "@/lib/website-builder/templates";
import type { BuilderPageSummary } from "@/lib/website-builder/queries";
import { cn } from "@/lib/utils";

export function BuilderPagesPanel({
  pages,
  currentPageId,
  orgSlug,
}: {
  pages: BuilderPageSummary[]
  currentPageId: string
  orgSlug: string
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const suggested = useMemo(() => suggestPageSlug(name), [name]);

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {pages.map((page) => {
          const selected = page.id === currentPageId;
          const href = page.isHome
            ? "/app/website-builder"
            : `/app/website-builder?page=${page.id}`;
          return (
            <li
              key={page.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2",
                selected && "border-foreground",
              )}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {page.label}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {page.status === "published" ? "Published" : "Draft"}
                  </span>
                </p>
                <p className="truncate font-mono text-xs text-muted-foreground">
                  /w/{orgSlug}{page.isHome ? "" : `/${page.slug}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant={selected ? "default" : "outline"} asChild>
                  <a href={href}>{selected ? "Editing" : "Edit"}</a>
                </Button>
                {!page.isHome && page.status !== "published" ? (
                  <SaveForm
                    action={removeBuilderPage}
                    successMessage="Page removed."
                  >
                    <input type="hidden" name="pageId" value={page.id} />
                    <SaveButton size="sm" variant="outline">
                      Remove
                    </SaveButton>
                  </SaveForm>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <SaveForm
        action={createBuilderPage}
        successMessage="Draft page created."
        resetOnSuccess
        onSuccess={() => {
          setName("");
          setSlug("");
          setSlugTouched(false);
        }}
        className="space-y-3 rounded-lg border p-3"
      >
        <p className="text-sm font-medium">Add a page</p>
        <p className="text-xs text-muted-foreground">
          Starts as a draft. Publish it when you want it live. This does not
          create a page on the connected existing website.
        </p>
        <div className="space-y-2">
          <Label htmlFor="page-title">Page name</Label>
          <Input
            id="page-title"
            name="title"
            value={name}
            onChange={(event) => {
              const next = event.target.value;
              setName(next);
              if (!slugTouched) setSlug(suggestPageSlug(next));
            }}
            placeholder="About"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="page-slug">Address</Label>
          <div className="flex items-center gap-1">
            <span className="shrink-0 text-xs text-muted-foreground">/w/{orgSlug}/</span>
            <Input
              id="page-slug"
              name="slug"
              value={slugTouched ? slug : suggested}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
              placeholder="about"
              required
            />
          </div>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Starting layout</legend>
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 has-[:checked]:border-foreground">
            <input
              type="radio"
              name="templateId"
              value={BLANK_PAGE_TEMPLATE_ID}
              defaultChecked
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium">Blank page</span>
              <span className="text-xs text-muted-foreground">
                One empty row. Add your own widgets.
              </span>
            </span>
          </label>
          {BUILDER_TEMPLATES.map((template) => (
            <label
              key={template.id}
              className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 has-[:checked]:border-foreground"
            >
              <input type="radio" name="templateId" value={template.id} className="mt-1" />
              <span>
                <span className="block text-sm font-medium">{template.name}</span>
                <span className="text-xs text-muted-foreground">{template.sectionSummary}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <SaveButton>Add a page</SaveButton>
      </SaveForm>
    </div>
  );
}
