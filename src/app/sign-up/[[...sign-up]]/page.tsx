import { SignUp } from "@clerk/nextjs";

import { AuthFrame } from "@/components/auth-frame";
import { WebsiteUpdateExpectation } from "@/components/website-update-expectation";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PRODUCT_NAME } from "@/lib/brand";
import { isClerkConfigured } from "@/lib/env";

export default function SignUpPage() {
  if (!isClerkConfigured()) {
    return (
      <AuthFrame title="Create an account">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Sign-up is not connected yet</CardTitle>
            <CardDescription>
              Add Clerk on the {PRODUCT_NAME} Vercel project, then redeploy.
            </CardDescription>
          </CardHeader>
        </Card>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title="Create an account">
      <div className="w-full max-w-md">
        <WebsiteUpdateExpectation compact />
      </div>
      <SignUp />
    </AuthFrame>
  );
}
