import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BuilderPageView } from "@/components/builder-page-view";
import { PRODUCT_NAME } from "@/lib/brand";
import { getPublishedBuilderPage } from "@/lib/website-builder/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}): Promise<Metadata> {
  const { orgSlug } = await params;
  const page = await getPublishedBuilderPage(orgSlug);
  if (!page) {
    return { title: PRODUCT_NAME, robots: { index: false, follow: false } };
  }
  const description =
    page.sections.find((section) => section.content.subheading)?.content.subheading ||
    page.brand?.description ||
    page.site.title;
  return {
    title: page.site.title || page.brand?.businessName || page.organization.name,
    description,
  };
}

export default async function PublicBuilderPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params;
  const page = await getPublishedBuilderPage(orgSlug);
  if (!page) notFound();

  return (
    <main>
      <BuilderPageView
        title={page.site.title || page.brand?.businessName || page.organization.name}
        orgSlug={page.organization.slug}
        sections={page.sections}
      />
    </main>
  );
}
