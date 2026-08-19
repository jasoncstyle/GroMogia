import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { getDb } from "@/lib/db";
import { brandSettings, organizations } from "@/lib/db/schema";
import { PublicLeadForm } from "@/components/public-lead-form";

export const dynamic = "force-dynamic";

export default async function PublicLeadPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ utm_campaign?: string; utm_source?: string }>
}) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const db = getDb();
  if (!db) notFound();

  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, orgSlug))
    .limit(1);
  if (!organization) notFound();

  const [brand] = await db
    .select()
    .from(brandSettings)
    .where(eq(brandSettings.organizationId, organization.id))
    .limit(1);

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col gap-6 px-6 py-16">
      <div>
        <p className="text-sm text-muted-foreground">GroovGro</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {brand?.businessName || organization.name}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {brand?.description || "Tell us how to reach you. We will get back to you."}
        </p>
      </div>
      <PublicLeadForm
        orgSlug={organization.slug}
        campaign={query.utm_campaign || query.utm_source || ""}
      />
    </div>
  );
}
