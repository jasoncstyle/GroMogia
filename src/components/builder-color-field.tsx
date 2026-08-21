"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  BUILDER_BACKGROUND_SWATCHES,
  BUILDER_TEXT_SWATCHES,
  type BuilderTheme,
} from "@/lib/website-builder/style";

export function BuilderColorField({
  id,
  name,
  label,
  value,
  swatches,
  onChange,
}: {
  id: string
  name: string
  label: string
  value: string
  swatches: readonly { label: string; value: string }[]
  onChange?: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <input type="hidden" id={id} name={name} value={value} />
      <div className="flex flex-wrap gap-1.5">
        {swatches.map((swatch) => {
          const selected = value === swatch.value;
          return (
            <button
              key={`${name}-${swatch.label}`}
              type="button"
              title={swatch.label}
              onClick={() => onChange?.(swatch.value)}
              className={cn(
                "size-7 rounded-full border",
                selected && "ring-2 ring-foreground ring-offset-2",
              )}
              style={{
                backgroundColor: swatch.value || "#ffffff",
                backgroundImage: swatch.value
                  ? undefined
                  : "linear-gradient(135deg, transparent 46%, #ef4444 50%, transparent 54%)",
              }}
            >
              <span className="sr-only">{swatch.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BuilderThemeFields({
  theme,
  onChange,
}: {
  theme: BuilderTheme
  onChange: (theme: BuilderTheme) => void
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <BuilderColorField
        id="pageBackground"
        name="pageBackground"
        label="Page background"
        value={theme.pageBackground}
        swatches={BUILDER_BACKGROUND_SWATCHES}
        onChange={(pageBackground) => onChange({ ...theme, pageBackground })}
      />
      <BuilderColorField
        id="textColor"
        name="textColor"
        label="Page text"
        value={theme.textColor}
        swatches={BUILDER_TEXT_SWATCHES}
        onChange={(textColor) => onChange({ ...theme, textColor })}
      />
      <BuilderColorField
        id="headingColor"
        name="headingColor"
        label="Headings"
        value={theme.headingColor}
        swatches={BUILDER_TEXT_SWATCHES}
        onChange={(headingColor) => onChange({ ...theme, headingColor })}
      />
      <BuilderColorField
        id="buttonBackground"
        name="buttonBackground"
        label="Button background"
        value={theme.buttonBackground}
        swatches={BUILDER_BACKGROUND_SWATCHES}
        onChange={(buttonBackground) => onChange({ ...theme, buttonBackground })}
      />
      <BuilderColorField
        id="buttonText"
        name="buttonText"
        label="Button text"
        value={theme.buttonText}
        swatches={BUILDER_TEXT_SWATCHES}
        onChange={(buttonText) => onChange({ ...theme, buttonText })}
      />
    </div>
  );
}
