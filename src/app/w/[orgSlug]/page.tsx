import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BuilderPageView } from "@/components/builder-page-view";
import { PRODUCT_NAME } from "@/lib/brand";
import { appUrl } from "@/lib/env";
import {
  builderPublicUrl,
  publicBuilderPageSeo,
} from "@/lib/website-builder/apply-seo";
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
  const seo = publicBuilderPageSeo({
    title: page.site.title || page.brand?.businessName || page.organization.name,
    metaDescription: page.site.metaDescription,
    canonicalUrl: builderPublicUrl(appUrl(), page.organization.slug),
    businessName: page.brand?.businessName || page.organization.name,
    description: page.brand?.description ?? "",
  });
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: seo.canonicalUrl },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: seo.canonicalUrl,
      type: "website",
    },
    robots: { index: true, follow: true },
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

  const seo = publicBuilderPageSeo({
    title: page.site.title || page.brand?.businessName || page.organization.name,
    metaDescription: page.site.metaDescription,
    canonicalUrl: builderPublicUrl(appUrl(), page.organization.slug),
    businessName: page.brand?.businessName || page.organization.name,
    description: page.brand?.description ?? "",
  });

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(seo.jsonLd) }}
      />
      <BuilderPageView
        title={seo.title}
        orgSlug={page.organization.slug}
        sections={page.sections}
      />
    </main>
  );
}
