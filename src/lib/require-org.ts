import { getAppSession, type AppSession } from "@/lib/auth/session";

export type OrgSession = AppSession & {
  userId: string
  organizationId: string
};

export async function requireOrgSession(): Promise<OrgSession> {
  const session = await getAppSession();
  if (!session.userId || !session.organizationId) {
    throw new Error("Sign in and connect the database before using this page.");
  }
  return session as OrgSession;
}
