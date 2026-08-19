import { SignIn } from "@clerk/nextjs";

import { AuthFrame } from "@/components/auth-frame";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PRODUCT_NAME } from "@/lib/brand";
import { isClerkConfigured } from "@/lib/env";

export default function SignInPage() {
  if (!isClerkConfigured()) {
    return (
      <AuthFrame title="Sign in">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Sign-in is not connected yet</CardTitle>
            <CardDescription>
              Add the Clerk integration on the {PRODUCT_NAME} Vercel project, then
              redeploy. Do not build a login system on your computer.
            </CardDescription>
          </CardHeader>
        </Card>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title="Sign in">
      <SignIn />
    </AuthFrame>
  );
}
