import type { Metadata } from "next";

import { PublicBuilderPageScreen, publishedBuilderMetadata } from "@/components/public-builder-page";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}): Promise<Metadata> {
  const { orgSlug } = await params;
  return publishedBuilderMetadata(orgSlug);
}

export default async function PublicBuilderHomePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params;
  return <PublicBuilderPageScreen orgSlug={orgSlug} />;
}
