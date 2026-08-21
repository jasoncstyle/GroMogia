"use client";

import { BUILDER_TEMPLATES } from "@/lib/website-builder/templates";
import { cn } from "@/lib/utils";

export function BuilderTemplatePicker({
  name = "templateId",
  defaultValue = "simple",
}: {
  name?: string
  defaultValue?: string
}) {
  return (
    <fieldset className="grid gap-3 sm:grid-cols-2">
      <legend className="sr-only">Starting layout</legend>
      {BUILDER_TEMPLATES.map((template) => (
        <label
          key={template.id}
          className={cn(
            "cursor-pointer rounded-xl border p-4 has-[:checked]:border-foreground has-[:checked]:ring-2 has-[:checked]:ring-foreground/20",
          )}
        >
          <input
            type="radio"
            name={name}
            value={template.id}
            defaultChecked={template.id === defaultValue}
            className="sr-only"
          />
          <p className="font-medium">{template.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
          <p className="mt-2 text-xs text-muted-foreground">{template.sectionSummary}</p>
        </label>
      ))}
    </fieldset>
  );
}
