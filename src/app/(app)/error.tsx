"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        The workspace could not load
      </h1>
      <p className="text-muted-foreground">
        You are signed in. GroMogia hit a server error while opening your
        organization. Reload after a minute. If it still fails, send this page
        to the Cloud Agent.
      </p>
      <Button type="button" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
