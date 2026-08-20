import { NextResponse } from "next/server";

import { hasTokenEncryptionKey, signOAuthState } from "@/lib/crypto/secret";
import { appUrl } from "@/lib/env";
import { getAppSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import {
  googleAuthorizeUrl,
  googleOAuthConfig,
} from "@/modules/integrations/google-search-console";

function seoRedirect(query: string) {
  return NextResponse.redirect(`${appUrl().replace(/\/$/, "")}/app/seo?${query}`);
}

export async function GET() {
  const config = googleOAuthConfig();
  if (!config || !hasTokenEncryptionKey()) {
    return seoRedirect(
      "gsc=error&error=" +
        encodeURIComponent(
          "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the Vercel project, then redeploy.",
        ),
    );
  }

  const session = await getAppSession();
  if (!session.userId || !session.organizationId) {
    return NextResponse.redirect(`${appUrl().replace(/\/$/, "")}/sign-in`);
  }
  if (
    !hasPermission(session.permissions, "manage_seo") &&
    !hasPermission(session.permissions, "manage_integrations")
  ) {
    return seoRedirect(
      "gsc=error&error=" +
        encodeURIComponent("You do not have permission to connect Search Console."),
    );
  }

  const state = signOAuthState({
    organizationId: session.organizationId,
    userId: session.userId,
    exp: Date.now() + 10 * 60 * 1000,
  });
  return NextResponse.redirect(googleAuthorizeUrl(state, config));
}
