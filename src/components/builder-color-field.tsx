"use client";

import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  BUILDER_BACKGROUND_SWATCHES,
  BUILDER_TEXT_SWATCHES,
  parseBuilderColor,
  type BuilderTheme,
} from "@/lib/website-builder/style";

function hexDigits(value: string): string {
  return value.replace(/^#/, "");
}

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
  const [typed, setTyped] = useState(hexDigits(value));

  useEffect(() => {
    setTyped(hexDigits(value));
  }, [value]);

  const parsedValue = parseBuilderColor(value);
  const wheelValue = parsedValue || parseBuilderColor(typed) || "#ffffff";

  function apply(next: string) {
    const empty = !next.trim() || next.trim() === "#";
    if (empty) {
      setTyped("");
      onChange?.("");
      return;
    }
    const parsed = parseBuilderColor(next);
    setTyped(hexDigits(parsed || next));
    if (parsed) onChange?.(parsed);
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <input type="hidden" name={name} value={value} />
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="color"
          aria-label={`${label} color wheel`}
          value={wheelValue}
          onChange={(event) => apply(event.target.value)}
          className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
        />
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground" aria-hidden="true">
            #
          </span>
          <Input
            id={id}
            value={typed}
            onChange={(event) => {
              const raw = event.target.value.replace(/^#/, "").replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
              setTyped(raw);
              if (!raw) {
                onChange?.("");
                return;
              }
              const parsed = parseBuilderColor(raw);
              if (parsed) onChange?.(parsed);
            }}
            onBlur={() => {
              const parsed = parseBuilderColor(typed);
              if (parsed) {
                setTyped(hexDigits(parsed));
                onChange?.(parsed);
              } else if (!typed) {
                onChange?.("");
              }
            }}
            placeholder="ffffff"
            autoComplete="off"
            spellCheck={false}
            maxLength={6}
            aria-label={`${label} hex code`}
            className="w-24 font-mono uppercase"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Use the color wheel, type a hex code, or pick a color below.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {swatches.map((swatch) => {
          const selected = value === swatch.value;
          return (
            <button
              key={`${name}-${swatch.label}`}
              type="button"
              title={swatch.label}
              onClick={() => apply(swatch.value)}
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
