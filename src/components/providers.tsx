"use client";

import { ClerkProvider } from "@clerk/nextjs";

import { clerkLocalization } from "@/lib/clerk-localization";

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

  return (
    <ClerkProvider localization={clerkLocalization}>{children}</ClerkProvider>
  );
}
