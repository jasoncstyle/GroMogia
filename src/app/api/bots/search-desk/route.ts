import { getSearchDeskForBots } from "@/lib/growth/search-loop-query";
import { requireBotOrganization } from "@/lib/growth/require-bot-org";

export async function GET(request: Request) {
  const access = await requireBotOrganization(request);
  if (!access.ok) {
    return Response.json({ error: access.error }, { status: access.status });
  }
  const desk = await getSearchDeskForBots(access.organizationId);
  return Response.json(desk);
}
