import { recordBotProposalPack } from "@/lib/growth/record-bot-pack";
import { requireBotOrganization } from "@/lib/growth/require-bot-org";
import { getBotProposalInbox, getBotTeamPayload } from "@/lib/growth/bot-team-query";
import {
  describeBotSeat,
  describeBotTeam,
  parseBotProposalPack,
  parseBotSeatPath,
} from "@/lib/growth/bot-team";

type RouteContext = { params: Promise<{ seat: string }> };

export async function GET(request: Request, context: RouteContext) {
  const seat = parseBotSeatPath((await context.params).seat);
  if (!seat) {
    return Response.json({ error: "Unknown bot seat." }, { status: 404 });
  }
  const access = await requireBotOrganization(request);
  if (!access.ok) {
    return Response.json({ error: access.error }, { status: access.status });
  }
  const meta = describeBotSeat(seat);
  const [payload, inbox] = await Promise.all([
    getBotTeamPayload(access.organizationId, seat),
    getBotProposalInbox(access.organizationId, seat),
  ]);
  return Response.json({
    team: describeBotTeam(),
    handoff: meta.handoff,
    ...payload,
    inbox: {
      heading: inbox.heading,
      proposed: inbox.items
        .filter((item) => item.status === "proposed")
        .map((item) => ({
          id: item.externalId,
          property: item.property,
          type: item.type,
          status: item.status,
        })),
    },
  });
}

export async function POST(request: Request, context: RouteContext) {
  const seat = parseBotSeatPath((await context.params).seat);
  if (!seat) {
    return Response.json({ error: "Unknown bot seat." }, { status: 404 });
  }
  const access = await requireBotOrganization(request);
  if (!access.ok) {
    return Response.json({ error: access.error }, { status: access.status });
  }
  let raw = "";
  try {
    const body = await request.json();
    raw = typeof body === "string" ? body : JSON.stringify(body);
  } catch {
    return Response.json(
      { error: "Send a JSON proposal pack. Do not set shipped." },
      { status: 400 },
    );
  }
  try {
    const pack = parseBotProposalPack(raw, seat);
    const saved = await recordBotProposalPack({
      organizationId: access.organizationId,
      pack,
      via: "handoff",
    });
    return Response.json({
      ok: true,
      packId: saved.packId,
      count: saved.count,
      property: pack.property,
      seat: pack.seat,
      status: "proposed",
      applied: false,
      sent: false,
      published: false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save that proposal pack.";
    return Response.json({ error: message }, { status: 400 });
  }
}
