"use client";

import { ClerkProvider } from "@clerk/nextjs";

export function Providers({
  children,
  clerkEnabled,
}: {
  children: React.ReactNode
  clerkEnabled: boolean
}) {
  if (!clerkEnabled) {
    return children;
  }

  return <ClerkProvider>{children}</ClerkProvider>;
}
