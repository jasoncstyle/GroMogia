import {
  addBuilderSection,
  createBuilderSite,
  moveBuilderSection,
  publishBuilderSite,
  removeBuilderSection,
  saveBuilderSection,
  saveBuilderSite,
  unpublishBuilderSite,
} from "@/lib/actions/website-builder";
import { getAppSession } from "@/lib/auth/session";
import { appUrl } from "@/lib/env";
import { resolveOrganizationSlug } from "@/lib/org";
import {
  BUILDER_SECTION_TYPES,
  builderSectionLabel,
} from "@/lib/website-builder/sections";
import { getBuilderEditorData } from "@/lib/website-builder/queries";
import { CopyLink } from "@/components/copy-link";
import { FoldableSample } from "@/components/foldable-sample";
import { SaveButton, SaveForm } from "@/components/save-form";
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
import type { BuilderSectionContent } from "@/lib/db/schema";

export default async function WebsiteBuilderPage() {
  const session = await getAppSession();
  const data = session.organizationId
    ? await getBuilderEditorData(session.organizationId)
    : { site: null, sections: [], brand: null };
  const slug = await resolveOrganizationSlug(
    session.organizationId,
    session.organizationSlug,
  );
  const publicUrl = slug ? `${appUrl()}/w/${slug}` : "";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Website builder</h1>
        <p className="text-muted-foreground">
          Optional GroovGro-hosted page made of sections. This does not replace
          the connected existing website, and it does not change Stripe checkout.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How this works</CardTitle>
          <CardDescription>
            Publish turns this page on at a GroovGro address. Approved SEO title,
            description, and heading drafts can be applied here. Your current
            public site stays as it is unless you later point a domain here.
          </CardDescription>
        </CardHeader>
      </Card>

      {!session.organizationId ? (
        <p className="text-sm text-muted-foreground">
          Sign in to create a GroovGro website.
        </p>
      ) : !data.site ? (
        <Card>
          <CardHeader>
            <CardTitle>Create a draft website</CardTitle>
            <CardDescription>
              GroovGro will start from your brand name and description. Nothing
              is public until you click Publish.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SaveForm
              action={createBuilderSite}
              successMessage="Draft website created."
            >
              <SaveButton>Create draft website</SaveButton>
            </SaveForm>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                {data.site.status === "published" ? "Published" : "Draft"}
              </CardTitle>
              <CardDescription>
                Starter copy comes from Brand
                {data.brand?.businessName ? ` (${data.brand.businessName})` : ""}.
                {publicUrl
                  ? " Share this GroovGro link after you publish."
                  : " Public link appears after the organization slug is ready."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {publicUrl ? (
                <CopyLink url={publicUrl} openLabel="Open page" />
              ) : null}
              <SaveForm
                action={saveBuilderSite}
                successMessage="Website details saved."
                className="space-y-3"
              >
                <div className="space-y-2">
                  <Label htmlFor="title">Page title</Label>
                  <Input
                    id="title"
                    name="title"
                    defaultValue={data.site.title}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="metaDescription">Search description</Label>
                  <Textarea
                    id="metaDescription"
                    name="metaDescription"
                    defaultValue={data.site.metaDescription}
                    rows={3}
                    maxLength={160}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used in search results and share previews for this GroovGro
                    page. Up to 160 characters.
                  </p>
                </div>
                <SaveButton>Save details</SaveButton>
              </SaveForm>
              <div className="flex flex-wrap gap-2">
                {data.site.status === "published" ? (
                  <SaveForm
                    action={unpublishBuilderSite}
                    successMessage="Unpublished."
                  >
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

          {data.sections.map((section, index) => (
            <Card key={section.id}>
              <CardHeader>
                <CardTitle>{builderSectionLabel(section.type)} section</CardTitle>
                <CardDescription>
                  {section.visible ? "Visible on the public page" : "Hidden on the public page"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FoldableSample
                  title="Edit copy"
                  subtitle={section.content.heading || "Closed"}
                >
                  <SaveForm
                    action={saveBuilderSection}
                    successMessage="Section saved."
                    className="space-y-3"
                  >
                    <input type="hidden" name="sectionId" value={section.id} />
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="visible"
                        defaultChecked={section.visible}
                      />
                      Show this section
                    </label>
                    <SectionFields
                      sectionId={section.id}
                      type={section.type}
                      content={section.content}
                    />
                    <SaveButton>Save section</SaveButton>
                  </SaveForm>
                </FoldableSample>
                <div className="flex flex-wrap gap-2">
                  {index > 0 ? (
                    <SaveForm action={moveBuilderSection} successMessage="Section order saved.">
                      <input type="hidden" name="sectionId" value={section.id} />
                      <input type="hidden" name="direction" value="up" />
                      <SaveButton size="sm" variant="outline">
                        Move up
                      </SaveButton>
                    </SaveForm>
                  ) : null}
                  {index < data.sections.length - 1 ? (
                    <SaveForm action={moveBuilderSection} successMessage="Section order saved.">
                      <input type="hidden" name="sectionId" value={section.id} />
                      <input type="hidden" name="direction" value="down" />
                      <SaveButton size="sm" variant="outline">
                        Move down
                      </SaveButton>
                    </SaveForm>
                  ) : null}
                  <SaveForm action={removeBuilderSection} successMessage="Section removed.">
                    <input type="hidden" name="sectionId" value={section.id} />
                    <SaveButton size="sm" variant="outline">
                      Remove
                    </SaveButton>
                  </SaveForm>
                </div>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle>Add a section</CardTitle>
            </CardHeader>
            <CardContent>
              <SaveForm action={addBuilderSection} successMessage="Section added." className="flex flex-wrap items-end gap-3">
                <div className="space-y-2">
                  <Label htmlFor="type">Section type</Label>
                  <select
                    id="type"
                    name="type"
                    className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    defaultValue="text"
                  >
                    {BUILDER_SECTION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {builderSectionLabel(type)}
                      </option>
                    ))}
                  </select>
                </div>
                <SaveButton>Add section</SaveButton>
              </SaveForm>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function SectionFields({
  sectionId,
  type,
  content,
}: {
  sectionId: string
  type: string
  content: BuilderSectionContent
}) {
  const usesSubheading = type === "hero";
  const usesBody = type !== "hero";
  const usesButton =
    type === "hero" || type === "cta" || type === "contact";
  const usesImage = type === "hero" || type === "image_text";
  const usesItems =
    type === "features" || type === "testimonials" || type === "faq";

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`heading-${sectionId}`}>Heading</Label>
        <Input
          id={`heading-${sectionId}`}
          name="heading"
          defaultValue={content.heading ?? ""}
        />
      </div>
      {usesSubheading ? (
        <div className="space-y-2">
          <Label htmlFor={`subheading-${sectionId}`}>Subheading</Label>
          <Textarea
            id={`subheading-${sectionId}`}
            name="subheading"
            defaultValue={content.subheading ?? ""}
            rows={3}
          />
        </div>
      ) : null}
      {usesBody ? (
        <div className="space-y-2">
          <Label htmlFor={`body-${sectionId}`}>Body</Label>
          <Textarea
            id={`body-${sectionId}`}
            name="body"
            defaultValue={content.body ?? ""}
            rows={4}
          />
        </div>
      ) : null}
      {usesItems ? (
        <div className="space-y-2">
          <Label htmlFor={`items-${sectionId}`}>Items</Label>
          <Textarea
            id={`items-${sectionId}`}
            name="items"
            defaultValue={content.items ?? ""}
            rows={6}
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
              defaultValue={content.imageUrl ?? ""}
              placeholder="https://"
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
              defaultValue={content.imageAlt ?? ""}
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
              defaultValue={content.buttonLabel ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`buttonHref-${sectionId}`}>Button link</Label>
            <Input
              id={`buttonHref-${sectionId}`}
              name="buttonHref"
              defaultValue={content.buttonHref ?? ""}
              placeholder="#lead, mailto:, or https://"
            />
          </div>
        </>
      ) : null}
    </>
  );
}
