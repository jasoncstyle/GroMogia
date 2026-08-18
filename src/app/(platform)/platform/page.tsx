import { getAppSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function PlatformPage() {
  const session = await getAppSession();

  if (!session.isPlatformAdmin) {
    return (
      <div className="mx-auto max-w-xl space-y-3 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Mogia Group admin
        </h1>
        <p className="text-muted-foreground">
          This area is only for platform super admins. Organization owners do
          not see other customers here.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-3 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Mogia Group admin
      </h1>
      <p className="text-muted-foreground">
        Organization list, flags, and system health land here in a later pass.
        Keep this surface separate from the customer app.
      </p>
    </div>
  );
}
