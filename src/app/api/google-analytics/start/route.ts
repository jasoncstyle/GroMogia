import { NextResponse } from "next/server";

import { hasTokenEncryptionKey, signOAuthState } from "@/lib/crypto/secret";
import { appUrl } from "@/lib/env";
import { getAppSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import {
  googleAnalyticsAuthorizeUrl,
  googleAnalyticsOAuthConfig,
} from "@/modules/integrations/google-analytics";

function analyticsRedirect(query: string) {
  return NextResponse.redirect(`${appUrl().replace(/\/$/, "")}/app/analytics?${query}`);
}

export async function GET() {
  const config = googleAnalyticsOAuthConfig();
  if (!config || !hasTokenEncryptionKey()) {
    return analyticsRedirect(
      "ga4=error&error=" +
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
    return analyticsRedirect(
      "ga4=error&error=" +
        encodeURIComponent("You do not have permission to connect Google Analytics."),
    );
  }

  const state = signOAuthState({
    organizationId: session.organizationId,
    userId: session.userId,
    exp: Date.now() + 10 * 60 * 1000,
  });
  return NextResponse.redirect(googleAnalyticsAuthorizeUrl(state, config));
}
