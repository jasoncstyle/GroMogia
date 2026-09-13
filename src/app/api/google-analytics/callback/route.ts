import { NextResponse } from "next/server";

import { completeGa4OAuth } from "@/lib/actions/ga4";
import { getAppSession } from "@/lib/auth/session";
import { readOAuthState } from "@/lib/crypto/secret";
import { appUrl } from "@/lib/env";
import { googleAnalyticsOAuthConfig } from "@/modules/integrations/google-analytics";
import { exchangeGoogleCode } from "@/modules/integrations/google-search-console";

function analyticsRedirect(query: string) {
  return NextResponse.redirect(`${appUrl().replace(/\/$/, "")}/app/analytics?${query}`);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  if (error) {
    return analyticsRedirect(
      "ga4=error&error=" +
        encodeURIComponent("Google sign-in was cancelled. Analytics was not connected."),
    );
  }

  const code = url.searchParams.get("code");
  const stateValue = url.searchParams.get("state");
  if (!code || !stateValue) {
    return analyticsRedirect(
      "ga4=error&error=" +
        encodeURIComponent("Google sign-in did not finish. Start connect again."),
    );
  }

  try {
    const session = await getAppSession();
    if (!session.userId || !session.organizationId) {
      return NextResponse.redirect(`${appUrl().replace(/\/$/, "")}/sign-in`);
    }

    const state = readOAuthState(stateValue);
    if (Number(state.exp ?? 0) < Date.now()) {
      throw new Error("Google sign-in expired. Start connect again.");
    }
    if (
      state.organizationId !== session.organizationId ||
      state.userId !== session.userId
    ) {
      throw new Error("Google sign-in did not match this GroovGro account.");
    }

    const config = googleAnalyticsOAuthConfig();
    if (!config) {
      throw new Error("Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel, then redeploy.");
    }

    const tokens = await exchangeGoogleCode(code, config);
    const nextPath = await completeGa4OAuth({
      organizationId: session.organizationId,
      userId: session.userId,
      refreshToken: tokens.refreshToken,
      accessToken: tokens.accessToken,
    });
    return NextResponse.redirect(`${appUrl().replace(/\/$/, "")}${nextPath}`);
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message : "Could not connect Google Analytics.";
    return analyticsRedirect("ga4=error&error=" + encodeURIComponent(message));
  }
}
