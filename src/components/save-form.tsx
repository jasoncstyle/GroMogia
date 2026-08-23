"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";

type SaveAction = (formData: FormData) => Promise<ActionResult>;

export function SaveForm({
  action,
  successMessage,
  resetOnSuccess = false,
  onSuccess,
  className,
  children,
}: {
  action: SaveAction
  successMessage: string
  resetOnSuccess?: boolean
  onSuccess?: () => void
  className?: string
  children: React.ReactNode
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => {
      const result = await action(formData);
      if (result.ok) {
        toast.success(result.message ?? successMessage);
        if (resetOnSuccess) formRef.current?.reset();
        onSuccess?.();
      } else {
        toast.error(result.error);
      }
      return result;
    },
    null,
  );

  return (
    <form ref={formRef} action={formAction} className={className}>
      {state && !state.ok ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {children}
    </form>
  );
}

export function SaveButton({
  children,
  pendingLabel = "Saving…",
  disabled,
  ...props
}: React.ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" {...props} disabled={pending || disabled}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
