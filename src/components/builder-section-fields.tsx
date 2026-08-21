import type { ChangeEvent } from "react";

import type { BuilderSectionContent } from "@/lib/db/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  const usesSubheading = type === "hero";
  const usesBody = type !== "hero";
  const usesButton = type === "hero" || type === "cta" || type === "contact";
  const usesImage = type === "hero" || type === "image_text";
  const usesItems =
    type === "features" || type === "testimonials" || type === "faq";

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

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`heading-${sectionId}`}>Heading</Label>
        <Input
          id={`heading-${sectionId}`}
          name="heading"
          {...textProps("heading", content.heading ?? "")}
        />
      </div>
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
          <Label htmlFor={`body-${sectionId}`}>Body</Label>
          <Textarea
            id={`body-${sectionId}`}
            name="body"
            rows={4}
            {...textProps("body", content.body ?? "")}
          />
        </div>
      ) : null}
      {usesItems ? (
        <div className="space-y-2">
          <Label htmlFor={`items-${sectionId}`}>Items</Label>
          <Textarea
            id={`items-${sectionId}`}
            name="items"
            rows={6}
            {...textProps("items", content.items ?? "")}
          />
          <p className="text-xs text-muted-foreground">
            One item per line. Use a bar | between the title and the detail. Up
            to 8 lines.
          </p>
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
    </>
  );
}
