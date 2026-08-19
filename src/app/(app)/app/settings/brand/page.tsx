import { eq } from "drizzle-orm";

import { updateBrandSettings } from "@/lib/actions/brand";
import { getAppSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { brandSettings } from "@/lib/db/schema";
import { SaveButton, SaveForm } from "@/components/save-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default async function BrandSettingsPage() {
  const session = await getAppSession();
  const db = getDb();
  const existing =
    db && session.organizationId
      ? await db
          .select()
          .from(brandSettings)
          .where(eq(brandSettings.organizationId, session.organizationId))
          .limit(1)
      : [];
  const brand = existing[0];

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Brand</h1>
        <p className="text-muted-foreground">
          This is the organization&apos;s source of truth. Later modules must
          not keep a second copy.
        </p>
      </div>
      <SaveForm action={updateBrandSettings} successMessage="Brand saved" className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="businessName">Business name</Label>
          <Input
            id="businessName"
            name="businessName"
            defaultValue={brand?.businessName ?? session.organizationName ?? ""}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">What the business does</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={brand?.description ?? ""}
            rows={4}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="targetCustomers">Who it serves</Label>
          <Input
            id="targetCustomers"
            name="targetCustomers"
            defaultValue={brand?.targetCustomers ?? ""}
          />
        </div>
        <SaveButton type="submit" disabled={!session.organizationId}>
          Save brand
        </SaveButton>
        {!session.organizationId ? (
          <p className="text-sm text-muted-foreground">
            Connect Clerk and Neon, then sign in, before this form can save.
          </p>
        ) : null}
      </SaveForm>
    </div>
  );
}
