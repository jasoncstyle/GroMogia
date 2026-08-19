"use client";

import { ClerkProvider } from "@clerk/nextjs";

import { Toaster } from "@/components/ui/sonner";
import { clerkLocalization } from "@/lib/clerk-localization";

export function Providers({
  children,
  clerkEnabled,
}: {
  children: React.ReactNode
  clerkEnabled: boolean
}) {
  const tree = (
    <>
      {children}
      <Toaster />
    </>
  );

  if (!clerkEnabled) {
    return tree;
  }

  return (
    <ClerkProvider localization={clerkLocalization}>{tree}</ClerkProvider>
  );
}
