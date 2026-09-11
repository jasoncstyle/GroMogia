import {
  EXECUTION_PROVIDER_NONE,
  configuredExecutionProvider,
  executionEnabled,
} from "@/lib/execute/provider";

/**
 * Execute adapter. Running stays off until Jason turns it on.
 * This function never fetches, sends email, buys ads, or writes a site.
 */
export type ExecutionAdapterRequest = {
  organizationId: string
  actionId: string
  title: string
};

export type ExecutionAdapterResponse = {
  status: "off"
  reason: string
};

export function requestExecute(
  input: ExecutionAdapterRequest,
): ExecutionAdapterResponse {
  if (!input.organizationId || !(input.actionId ?? "").trim()) {
    return {
      status: "off",
      reason:
        "Missing organization or approved work. GroovGro will not run it, buy ads, or change the live website.",
    };
  }
  if (
    !executionEnabled() ||
    configuredExecutionProvider() === EXECUTION_PROVIDER_NONE
  ) {
    return {
      status: "off",
      reason:
        "Execution is off. GroovGro will not run this work, buy ads, send email, or change the live website.",
    };
  }
  return {
    status: "off",
    reason:
      "No execute adapter is configured. GroovGro will not run this work, buy ads, or change the live website.",
  };
}
