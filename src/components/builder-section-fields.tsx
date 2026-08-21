import type { ChangeEvent } from "react";

import { BuilderColorField } from "@/components/builder-color-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BuilderSectionContent } from "@/lib/db/schema";
import {
  BUILDER_BACKGROUND_SWATCHES,
  BUILDER_HEADING_LEVELS,
  BUILDER_TEXT_SWATCHES,
} from "@/lib/website-builder/style";

export function BuilderSectionFields({
  sectionId,
  type,
  content,
  onChange,
}: {
  sectionId: string
  type: string
  content: BuilderSectionContent
  onChange?: (content: BuilderSectionContent) => void
}) {
  const usesHeading = type !== "button";
  const usesSubheading = type === "hero";
  const usesBody =
    type !== "hero" &&
    type !== "button" &&
    type !== "image" &&
    type !== "gallery";
  const usesHeadingLevel = usesHeading;
  const usesLink = type === "text";
  const usesButton =
    type === "hero" || type === "cta" || type === "contact" || type === "button";
  const usesImage =
    type === "hero" || type === "image_text" || type === "image";
  const usesItems =
    type === "features" ||
    type === "testimonials" ||
    type === "faq" ||
    type === "gallery" ||
    type === "pricing" ||
    type === "hours" ||
    type === "social";
  const itemsHint =
    type === "gallery"
      ? "One photo per line: https://image... | short description. Up to 8 lines."
      : type === "social"
        ? "One profile per line: Name | https://... Up to 8 lines."
        : type === "pricing" || type === "hours"
          ? "One item per line. Use a bar | between the title and the detail. Up to 8 lines."
          : "One item per line. Use a bar | between the title and the detail. Up to 8 lines.";

  function textProps(name: keyof BuilderSectionContent, value: string) {
    if (onChange) {
      return {
        value,
        onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          onChange({ ...content, [name]: event.target.value }),
      };
    }
    return { defaultValue: value };
  }

  function setField(name: keyof BuilderSectionContent, value: string) {
    onChange?.({ ...content, [name]: value });
  }

  return (
    <>
      {usesHeading ? (
        <div className="space-y-2">
          <Label htmlFor={`heading-${sectionId}`}>Heading</Label>
          <Input
            id={`heading-${sectionId}`}
            name="heading"
            {...textProps("heading", content.heading ?? "")}
          />
        </div>
      ) : (
        <input type="hidden" name="heading" value="" />
      )}
      {usesHeadingLevel ? (
        <div className="space-y-2">
          <Label htmlFor={`headingLevel-${sectionId}`}>Heading size</Label>
          <select
            id={`headingLevel-${sectionId}`}
            name="headingLevel"
            value={content.headingLevel || "h2"}
            onChange={(event) => setField("headingLevel", event.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
          >
            {BUILDER_HEADING_LEVELS.map((level) => (
              <option key={level.id} value={level.id}>
                {level.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="headingLevel" value={content.headingLevel ?? ""} />
      )}
      {usesSubheading ? (
        <div className="space-y-2">
          <Label htmlFor={`subheading-${sectionId}`}>Subheading</Label>
          <Textarea
            id={`subheading-${sectionId}`}
            name="subheading"
            rows={3}
            {...textProps("subheading", content.subheading ?? "")}
          />
        </div>
      ) : null}
      {usesBody ? (
        <div className="space-y-2">
          <Label htmlFor={`body-${sectionId}`}>
            {type === "map" ? "Note under the map" : "Body"}
          </Label>
          <Textarea
            id={`body-${sectionId}`}
            name="body"
            rows={4}
            {...textProps("body", content.body ?? "")}
          />
        </div>
      ) : null}
      {usesLink ? (
        <>
          <div className="space-y-2">
            <Label htmlFor={`linkLabel-${sectionId}`}>Link text</Label>
            <Input
              id={`linkLabel-${sectionId}`}
              name="linkLabel"
              placeholder="Read more"
              {...textProps("linkLabel", content.linkLabel ?? "")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`linkHref-${sectionId}`}>Link address</Label>
            <Input
              id={`linkHref-${sectionId}`}
              name="linkHref"
              placeholder="https:// or mailto:"
              {...textProps("linkHref", content.linkHref ?? "")}
            />
          </div>
        </>
      ) : null}
      {usesItems ? (
        <div className="space-y-2">
          <Label htmlFor={`items-${sectionId}`}>
            {type === "gallery"
              ? "Photos"
              : type === "social"
                ? "Profiles"
                : type === "pricing"
                  ? "Plans"
                  : type === "hours"
                    ? "Hours"
                    : "Items"}
          </Label>
          <Textarea
            id={`items-${sectionId}`}
            name="items"
            rows={6}
            {...textProps("items", content.items ?? "")}
          />
          <p className="text-xs text-muted-foreground">{itemsHint}</p>
        </div>
      ) : null}
      {usesImage ? (
        <>
          <div className="space-y-2">
            <Label htmlFor={`imageUrl-${sectionId}`}>Image link</Label>
            <Input
              id={`imageUrl-${sectionId}`}
              name="imageUrl"
              placeholder="https://"
              {...textProps("imageUrl", content.imageUrl ?? "")}
            />
            <p className="text-xs text-muted-foreground">
              Paste a public https:// image. GroovGro does not upload files yet.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`imageAlt-${sectionId}`}>Image description</Label>
            <Input
              id={`imageAlt-${sectionId}`}
              name="imageAlt"
              {...textProps("imageAlt", content.imageAlt ?? "")}
            />
          </div>
        </>
      ) : null}
      {usesButton ? (
        <>
          <div className="space-y-2">
            <Label htmlFor={`buttonLabel-${sectionId}`}>Button label</Label>
            <Input
              id={`buttonLabel-${sectionId}`}
              name="buttonLabel"
              {...textProps("buttonLabel", content.buttonLabel ?? "")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`buttonHref-${sectionId}`}>Button link</Label>
            <Input
              id={`buttonHref-${sectionId}`}
              name="buttonHref"
              placeholder="#lead, mailto:, or https://"
              {...textProps("buttonHref", content.buttonHref ?? "")}
            />
          </div>
        </>
      ) : null}
      {type === "video" ? (
        <div className="space-y-2">
          <Label htmlFor={`videoUrl-${sectionId}`}>YouTube or Vimeo link</Label>
          <Input
            id={`videoUrl-${sectionId}`}
            name="videoUrl"
            placeholder="https://www.youtube.com/watch?v="
            {...textProps("videoUrl", content.videoUrl ?? "")}
          />
        </div>
      ) : null}
      {type === "map" ? (
        <div className="space-y-2">
          <Label htmlFor={`mapQuery-${sectionId}`}>Address or place</Label>
          <Input
            id={`mapQuery-${sectionId}`}
            name="mapQuery"
            placeholder="123 Main St, Springfield"
            {...textProps("mapQuery", content.mapQuery ?? "")}
          />
        </div>
      ) : null}
      {type === "countdown" ? (
        <div className="space-y-2">
          <Label htmlFor={`endAt-${sectionId}`}>Count down to</Label>
          <Input
            id={`endAt-${sectionId}`}
            name="endAt"
            type="datetime-local"
            {...textProps("endAt", toDatetimeLocal(content.endAt))}
          />
        </div>
      ) : null}
      {type === "call" ? (
        <>
          <div className="space-y-2">
            <Label htmlFor={`phone-${sectionId}`}>Phone</Label>
            <Input
              id={`phone-${sectionId}`}
              name="phone"
              placeholder="+1 555 555 0100"
              {...textProps("phone", content.phone ?? "")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`whatsapp-${sectionId}`}>WhatsApp number</Label>
            <Input
              id={`whatsapp-${sectionId}`}
              name="whatsapp"
              placeholder="15555550100"
              {...textProps("whatsapp", content.whatsapp ?? "")}
            />
            <p className="text-xs text-muted-foreground">
              Country code and digits only. Leave blank to skip WhatsApp.
            </p>
          </div>
        </>
      ) : null}
      <BuilderColorField
        id={`backgroundColor-${sectionId}`}
        name="backgroundColor"
        label="Box background"
        value={content.backgroundColor ?? ""}
        swatches={BUILDER_BACKGROUND_SWATCHES}
        onChange={(value) => setField("backgroundColor", value)}
      />
      <BuilderColorField
        id={`textColor-${sectionId}`}
        name="textColor"
        label="Text color"
        value={content.textColor ?? ""}
        swatches={BUILDER_TEXT_SWATCHES}
        onChange={(value) => setField("textColor", value)}
      />
      <BuilderColorField
        id={`headingColor-${sectionId}`}
        name="headingColor"
        label="Heading color"
        value={content.headingColor ?? ""}
        swatches={BUILDER_TEXT_SWATCHES}
        onChange={(value) => setField("headingColor", value)}
      />
    </>
  );
}

function toDatetimeLocal(value: string | undefined): string {
  if (!value) return "";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "";
  const date = new Date(parsed);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
