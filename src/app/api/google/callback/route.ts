import { NextResponse } from "next/server";

import { completeGoogleOAuth } from "@/lib/actions/search-console";
import { getAppSession } from "@/lib/auth/session";
import { readOAuthState } from "@/lib/crypto/secret";
import { appUrl } from "@/lib/env";
import {
  exchangeGoogleCode,
  googleOAuthConfig,
} from "@/modules/integrations/google-search-console";

function nextStepRedirect(query: string) {
  return NextResponse.redirect(`${appUrl().replace(/\/$/, "")}/app/next-step?${query}`);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  if (error) {
    return nextStepRedirect(
      "gsc=error&error=" +
        encodeURIComponent("Google sign-in was cancelled. Search Console was not connected."),
    );
  }

  const code = url.searchParams.get("code");
  const stateValue = url.searchParams.get("state");
  if (!code || !stateValue) {
    return nextStepRedirect(
      "gsc=error&error=" +
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

    const config = googleOAuthConfig();
    if (!config) {
      throw new Error("Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel, then redeploy.");
    }

    const tokens = await exchangeGoogleCode(code, config);
    const nextPath = await completeGoogleOAuth({
      organizationId: session.organizationId,
      userId: session.userId,
      refreshToken: tokens.refreshToken,
      accessToken: tokens.accessToken,
    });
    return NextResponse.redirect(`${appUrl().replace(/\/$/, "")}${nextPath}`);
  } catch (caught) {
    const message =
      caught instanceof Error
        ? caught.message
        : "Could not connect Search Console.";
    return nextStepRedirect("gsc=error&error=" + encodeURIComponent(message));
  }
}
