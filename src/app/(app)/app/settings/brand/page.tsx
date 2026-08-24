import { getAppSession } from "@/lib/auth/session";
import { getBrandSettingsForm } from "@/lib/growth/queries";
import { BrandSettingsForm } from "@/components/brand-settings-form";
import { OpenNextStepLink } from "@/components/open-next-step-link";

export default async function BrandSettingsPage() {
  const session = await getAppSession();
  const brand = session.organizationId
    ? await getBrandSettingsForm(session.organizationId)
    : null;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Brand</h1>
        <p className="text-muted-foreground">
          This is the organization&apos;s source of truth. Later modules must
          not keep a second copy.
        </p>
      </div>
      {session.organizationId ? (
        <BrandSettingsForm
          brand={brand}
          organizationName={session.organizationName}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Connect Clerk and Neon, then sign in, before this form can save.
        </p>
      )}

      <OpenNextStepLink />
    </div>
  );
}
