import type { Metadata } from "next";

import { PublicBuilderPageScreen, publishedBuilderMetadata } from "@/components/public-builder-page";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string; pageSlug: string }>
}): Promise<Metadata> {
  const { orgSlug, pageSlug } = await params;
  return publishedBuilderMetadata(orgSlug, pageSlug);
}

export default async function PublicBuilderInnerPage({
  params,
}: {
  params: Promise<{ orgSlug: string; pageSlug: string }>
}) {
  const { orgSlug, pageSlug } = await params;
  return <PublicBuilderPageScreen orgSlug={orgSlug} pageSlug={pageSlug} />;
}
