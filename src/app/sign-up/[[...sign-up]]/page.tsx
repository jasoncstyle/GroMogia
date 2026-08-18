import { SignUp } from "@clerk/nextjs";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isClerkConfigured } from "@/lib/env";

export default function SignUpPage() {
  if (!isClerkConfigured()) {
    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Sign-up is not connected yet</CardTitle>
            <CardDescription>
              Add Clerk on the Vercel project, then redeploy.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <SignUp />
    </div>
  );
}
