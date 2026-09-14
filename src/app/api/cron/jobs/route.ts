import { runDueScheduledJobs } from "@/lib/jobs/run";

export const runtime = "nodejs";
export const maxDuration = 300;

function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await runDueScheduledJobs();
    return Response.json({
      ok: true,
      ran: results.length,
      results: results.map((row) => ({
        taskKey: row.taskKey,
        status: row.status,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not run scheduled refreshes.";
    return Response.json({ error: message }, { status: 500 });
  }
}
