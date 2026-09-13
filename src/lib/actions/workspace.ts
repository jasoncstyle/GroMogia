"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordAudit } from "@/lib/audit";
import { getAppSession } from "@/lib/auth/session";
import {
  WORKSPACE_COOKIE,
  cleanWorkspaceId,
  safeAppPath,
} from "@/lib/auth/workspace";

export async function switchWorkspace(formData: FormData): Promise<void> {
  const organizationId = cleanWorkspaceId(formData.get("organizationId"));
  const next = safeAppPath(formData.get("next"));
  const session = await getAppSession();
  if (!session.userId) {
    throw new Error("Sign in before switching businesses.");
  }
  const allowed = session.workspaces.some(
    (workspace) => workspace.id === organizationId,
  );
  if (!organizationId || !allowed) {
    throw new Error("You do not belong to that business.");
  }

  const store = await cookies();
  store.set(WORKSPACE_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === "production",
  });

  await recordAudit({
    organizationId,
    actorUserId: session.userId,
    action: "workspace.switched",
    targetType: "organization",
    targetId: organizationId,
  });

  revalidatePath("/app", "layout");
  redirect(next);
}
