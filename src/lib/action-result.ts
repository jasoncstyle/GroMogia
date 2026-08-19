import { z } from "zod";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export function ok(message?: string): ActionResult {
  return message ? { ok: true, message } : { ok: true };
}

export function fail(error: unknown, fallback: string): ActionResult {
  if (error instanceof z.ZodError) {
    return { ok: false, error: error.issues[0]?.message || fallback };
  }
  if (error instanceof Error && error.message) {
    return { ok: false, error: error.message };
  }
  return { ok: false, error: fallback };
}

export async function runAction(
  fallback: string,
  work: () => Promise<string | void>,
): Promise<ActionResult> {
  try {
    const message = await work();
    return ok(typeof message === "string" ? message : undefined);
  } catch (error) {
    return fail(error, fallback);
  }
}
