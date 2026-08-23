import { AppShell } from "@/components/app-shell";
import { getAppSession } from "@/lib/auth/session";
import { isClerkConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getAppSession();
  return (
    <AppShell session={session} clerkEnabled={isClerkConfigured()}>
      {children}
    </AppShell>
  );
}
