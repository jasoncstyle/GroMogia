/**
 * Later execute-after-approval must stay behind this switch.
 * This slice has no provider. GroovGro does not run approved work,
 * buy ads, send email, or change the live website.
 */
export const EXECUTION_PROVIDER_NONE = "none";

export function configuredExecutionProvider(): typeof EXECUTION_PROVIDER_NONE {
  return EXECUTION_PROVIDER_NONE;
}

export function executionEnabled(): boolean {
  return false;
}
