import { eq } from "drizzle-orm";

import { createBuilderSite } from "@/lib/actions/website-builder";
import { WebsiteBuilderCreateSite } from "@/components/website-builder-create-site";
import { getAppSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { businessBrains } from "@/lib/db/schema";
import { appUrl } from "@/lib/env";
import { isBlobConfigured } from "@/lib/media/blob";
import { listMediaLibrary } from "@/lib/media/queries";
import { resolveOrganizationSlug } from "@/lib/org";
import { getBuilderEditorData } from "@/lib/website-builder/queries";
import { builderPublicUrl } from "@/lib/website-builder/apply-seo";
import { BuilderTemplatePicker } from "@/components/builder-template-picker";
import { SaveButton, SaveForm } from "@/components/save-form";
import { FoldableSample } from "@/components/foldable-sample";
import { WebsiteBuilderEditor } from "@/components/website-builder-editor";
import { WebsiteBuilderInspiration } from "@/components/website-builder-inspiration";
import { loadBuilderInspiration } from "@/lib/website-builder/persist-inspiration";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const maxDuration = 60;

export default async function WebsiteBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; restarted?: string; created?: string }>
}) {
  const session = await getAppSession();
  const { page: pageId, restarted, created } = await searchParams;
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
  const db = getDb();
  const [brain] =
    db && session.organizationId
      ? await db
          .select({ industry: businessBrains.industry })
          .from(businessBrains)
          .where(eq(businessBrains.organizationId, session.organizationId))
          .limit(1)
      : [];
  const savedInspiration = session.organizationId
    ? await loadBuilderInspiration(session.organizationId)
    : null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Website builder</h1>
        <p className="text-muted-foreground">
          Optional GroovGro-hosted pages built from rows and columns. Home is
          always there. GroovGro can draft Home, About, and Work from your
          business facts. This does not replace the connected existing
          website, and it does not change Stripe checkout.
        </p>
      </div>

      {created || restarted ? (
        <p
          role="status"
          className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-950"
        >
          GroovGro drafted an unpublished website. Open Pages for Home, About,
          and Work. If you started over, the last Home is Previous Home. Edit
          every line before you publish. Your connected live site was not
          changed.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>How this works</CardTitle>
          <CardDescription>
            Click Create my GroovGro website and GroovGro drafts Home, About,
            and Work from Brand, Business Brain, and confirmed offers. Pages
            stay unpublished. Pasted inspiration sites are optional and sit
            under a toggle. Your connected public site stays as it is.
          </CardDescription>
        </CardHeader>
      </Card>

      {!session.organizationId ? (
        <p className="text-sm text-muted-foreground">
          Sign in to create a GroovGro website.
        </p>
      ) : !data.site ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Create my GroovGro website</CardTitle>
              <CardDescription>
                GroovGro writes the first draft from your own business facts.
                You can edit and publish when you are ready.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WebsiteBuilderCreateSite disabled={!session.organizationId} />
            </CardContent>
          </Card>
          <FoldableSample
            title="Or start from websites you like"
            subtitle="Optional. Paste public pages for layout and topic labels."
          >
            <WebsiteBuilderInspiration
              businessType={brain?.industry ?? ""}
              disabled={!session.organizationId}
              savedFields={savedInspiration}
            />
          </FoldableSample>
          <FoldableSample
            title="Or choose a starting layout"
            subtitle="Optional numbered templates if you want to build from scratch."
          >
            <SaveForm
              action={createBuilderSite}
              successMessage="Draft website created."
              className="space-y-4"
            >
              <BuilderTemplatePicker />
              <SaveButton>Create draft website</SaveButton>
            </SaveForm>
          </FoldableSample>
        </>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Create a new GroovGro draft</CardTitle>
              <CardDescription>
                Replace Home with a new unpublished draft from your Brand,
                Business Brain, and confirmed offers. About and Work are added
                if they are not there yet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WebsiteBuilderCreateSite
                disabled={!session.organizationId}
                hasExistingHome
              />
            </CardContent>
          </Card>
          <WebsiteBuilderEditor
            key={`${data.site.id}-${String(data.site.updatedAt)}-${data.site.templateId}-${data.rows.length}`}
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
            chrome={data.chrome}
            chromeView={data.chromeView}
          />
          <FoldableSample
            title="Start Home over"
            subtitle="Closed until you need a new draft. GroovGro keeps the websites you pasted."
          >
            <WebsiteBuilderInspiration
              businessType={brain?.industry ?? ""}
              disabled={!session.organizationId}
              hasExistingHome
              savedFields={savedInspiration}
            />
          </FoldableSample>
        </>
      )}
    </div>
  );
}
