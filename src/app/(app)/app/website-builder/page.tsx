import { createBuilderSite } from "@/lib/actions/website-builder";
import { getAppSession } from "@/lib/auth/session";
import { appUrl } from "@/lib/env";
import { isBlobConfigured } from "@/lib/media/blob";
import { listMediaLibrary } from "@/lib/media/queries";
import { resolveOrganizationSlug } from "@/lib/org";
import { getBuilderEditorData } from "@/lib/website-builder/queries";
import { builderPublicUrl } from "@/lib/website-builder/apply-seo";
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

export default async function WebsiteBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await getAppSession();
  const { page: pageId } = await searchParams;
  const data = session.organizationId
    ? await getBuilderEditorData(session.organizationId, pageId)
    : { pages: [], site: null, rows: [], brand: null };
  const slug = await resolveOrganizationSlug(
    session.organizationId,
    session.organizationSlug,
  );
  const publicUrl =
    slug && data.site
      ? builderPublicUrl(appUrl(), slug, data.site.slug)
      : slug
        ? builderPublicUrl(appUrl(), slug)
        : "";
  const recentMedia = session.organizationId
    ? await listMediaLibrary(session.organizationId, 12)
    : [];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Website builder</h1>
        <p className="text-muted-foreground">
          Optional GroovGro-hosted pages built from rows and columns. Home is
          always there. Click Add a page for About or a service page. This
          does not replace the connected existing website, and it does not
          change Stripe checkout.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How this works</CardTitle>
          <CardDescription>
            Pick a starting layout, then click Create draft website for Home.
            Add extra pages when you need them. Each page stays a draft until
            you click Publish on that page. Your current public site stays as
            it is.
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
              After you create the draft, click Open page editor when you want
              to change the layout. Nothing is public until you click Publish.
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
          key={data.site.id}
          site={{
            id: data.site.id,
            title: data.site.title,
            slug: data.site.slug,
            metaDescription: data.site.metaDescription,
            status: data.site.status,
            theme: data.site.theme,
            templateId: data.site.templateId,
          }}
          pages={data.pages}
          rows={data.rows}
          brandName={data.brand?.businessName ?? null}
          orgSlug={slug ?? ""}
          publicUrl={publicUrl}
          uploadsEnabled={isBlobConfigured()}
          recentMedia={recentMedia}
        />
      )}
    </div>
  );
}
