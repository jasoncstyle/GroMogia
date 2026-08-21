import { createBuilderSite } from "@/lib/actions/website-builder";
import { getAppSession } from "@/lib/auth/session";
import { appUrl } from "@/lib/env";
import { resolveOrganizationSlug } from "@/lib/org";
import { getBuilderEditorData } from "@/lib/website-builder/queries";
import { BuilderTemplatePicker } from "@/components/builder-template-picker";
import { SaveButton, SaveForm } from "@/components/save-form";
import { WebsiteBuilderEditor } from "@/components/website-builder-editor";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function WebsiteBuilderPage() {
  const session = await getAppSession();
  const data = session.organizationId
    ? await getBuilderEditorData(session.organizationId)
    : { site: null, rows: [], brand: null };
  const slug = await resolveOrganizationSlug(
    session.organizationId,
    session.organizationSlug,
  );
  const publicUrl = slug ? `${appUrl()}/w/${slug}` : "";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Website builder</h1>
        <p className="text-muted-foreground">
          Optional GroovGro-hosted page built from rows and columns. The page
          editor opens when you have a draft. Click a box to change text or
          images. This does not replace the connected existing website, and it
          does not change Stripe checkout.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How this works</CardTitle>
          <CardDescription>
            Pick a starting layout, then click Create draft website. The page
            editor opens by itself. Add a row, choose how many columns it has,
            and drop widgets into the cells. Publish turns this page on at a
            GroovGro address. Your current public site stays as it is.
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
            <CardTitle>Choose a starting layout</CardTitle>
            <CardDescription>
              GroovGro fills the boxes from your brand name and description.
              After you create the draft, the page editor opens. Nothing is
              public until you click Publish.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SaveForm
              action={createBuilderSite}
              successMessage="Draft website created."
              className="space-y-4"
            >
              <BuilderTemplatePicker />
              <SaveButton>Create draft website</SaveButton>
            </SaveForm>
          </CardContent>
        </Card>
      ) : (
        <WebsiteBuilderEditor
          site={{
            title: data.site.title,
            metaDescription: data.site.metaDescription,
            status: data.site.status,
            theme: data.site.theme,
            templateId: data.site.templateId,
          }}
          rows={data.rows}
          brandName={data.brand?.businessName ?? null}
          orgSlug={slug ?? ""}
          publicUrl={publicUrl}
        />
      )}
    </div>
  );
}
