import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BuilderPageView } from "@/components/builder-page-view";
import { getAppSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { getBuilderEditorData } from "@/lib/website-builder/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Website preview",
  robots: { index: false, follow: false },
};

export default async function WebsiteBuilderPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await getAppSession();
  if (!session.organizationId || !hasPermission(session.permissions, "manage_website")) {
    redirect("/app/website-builder");
  }

  const { page: pageId } = await searchParams;
  const data = await getBuilderEditorData(session.organizationId, pageId);
  if (!data.site) {
    redirect("/app/website-builder");
  }

  const orgSlug = session.organizationSlug ?? "";
  const rows = data.rows.map((row) => ({
    ...row,
    widgets: row.widgets.filter((widget) => widget.visible),
  }));
  const navPages = data.pages.map((page) => ({
    href: page.isHome
      ? "/app/website-builder/preview"
      : `/app/website-builder/preview?page=${page.id}`,
    label: page.label,
    current: page.id === data.site?.id,
  }));

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-background">
      <div className="sticky top-0 z-10 border-b bg-amber-100 px-4 py-2 text-center text-sm text-amber-950">
        Preview — not live. Visitors cannot see this until you click Publish.
        The connected website is unchanged.{" "}
        <a
          href={
            data.site.slug
              ? `/app/website-builder?page=${data.site.id}`
              : "/app/website-builder"
          }
          className="font-medium underline underline-offset-4"
        >
          Back to editor
        </a>
      </div>
      <BuilderPageView
        title={data.site.title}
        orgSlug={orgSlug}
        rows={rows}
        theme={data.site.theme}
        navPages={navPages}
      />
    </div>
  );
}
