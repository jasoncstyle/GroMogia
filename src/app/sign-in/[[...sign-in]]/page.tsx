import { SignIn } from "@clerk/nextjs";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isClerkConfigured } from "@/lib/env";

export default function SignInPage() {
  if (!isClerkConfigured()) {
    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Sign-in is not connected yet</CardTitle>
            <CardDescription>
              Add the Clerk integration on the GroMogia Vercel project, then
              redeploy. Do not build a login system on your computer.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <SignIn />
    </div>
  );
}
