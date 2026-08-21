import { notFound } from "next/navigation";

import { BuilderPageView } from "@/components/builder-page-view";
import { PRODUCT_NAME } from "@/lib/brand";
import { appUrl } from "@/lib/env";
import {
  builderPublicUrl,
  publicBuilderPageSeo,
} from "@/lib/website-builder/apply-seo";
import { HOME_PAGE_SLUG } from "@/lib/website-builder/pages";
import { getPublishedBuilderPage } from "@/lib/website-builder/queries";

export async function publishedBuilderMetadata(orgSlug: string, pageSlug = HOME_PAGE_SLUG) {
  const page = await getPublishedBuilderPage(orgSlug, pageSlug);
  if (!page) {
    return { title: PRODUCT_NAME, robots: { index: false, follow: false } };
  }
  const seo = publicBuilderPageSeo({
    title: page.site.title || page.brand?.businessName || page.organization.name,
    metaDescription: page.site.metaDescription,
    canonicalUrl: builderPublicUrl(appUrl(), page.organization.slug, page.site.slug),
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

export async function PublicBuilderPageScreen({
  orgSlug,
  pageSlug = HOME_PAGE_SLUG,
}: {
  orgSlug: string
  pageSlug?: string
}) {
  const page = await getPublishedBuilderPage(orgSlug, pageSlug);
  if (!page) notFound();

  const seo = publicBuilderPageSeo({
    title: page.site.title || page.brand?.businessName || page.organization.name,
    metaDescription: page.site.metaDescription,
    canonicalUrl: builderPublicUrl(appUrl(), page.organization.slug, page.site.slug),
    businessName: page.brand?.businessName || page.organization.name,
    description: page.brand?.description ?? "",
  });
  const navPages = page.pages.map((item) => ({
    href: item.isHome
      ? `/w/${page.organization.slug}`
      : `/w/${page.organization.slug}/${item.slug}`,
    label: item.label,
    current: item.id === page.site.id,
  }));

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(seo.jsonLd) }}
      />
      <BuilderPageView
        title={seo.title}
        orgSlug={page.organization.slug}
        rows={page.rows}
        theme={page.site.theme}
        navPages={navPages}
      />
    </main>
  );
}
