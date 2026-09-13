import { recordScoutProposalPack } from "@/lib/growth/record-scout-pack";
import { requireBotOrganization } from "@/lib/growth/require-bot-org";
import {
  getScoutDeskPayload,
  getScoutProposalInbox,
} from "@/lib/growth/scout-proposal-query";
import {
  SCOUT_WALLS,
  describeBotTeam,
  describeScoutHandoff,
  parseScoutProposalPack,
} from "@/lib/growth/scout-proposals";

export async function GET(request: Request) {
  const access = await requireBotOrganization(request);
  if (!access.ok) {
    return Response.json({ error: access.error }, { status: access.status });
  }
  const [desk, inbox] = await Promise.all([
    getScoutDeskPayload(access.organizationId),
    getScoutProposalInbox(access.organizationId),
  ]);
  return Response.json({
    team: describeBotTeam(),
    handoff: describeScoutHandoff(),
    gsc: desk.gsc,
    publicPages: desk.publicPages,
    keywords: desk.keywords,
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
    walls: desk.gsc?.walls ?? [...SCOUT_WALLS],
  });
}

export async function POST(request: Request) {
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
    const pack = parseScoutProposalPack(raw);
    const saved = await recordScoutProposalPack({
      organizationId: access.organizationId,
      pack,
      via: "handoff",
    });
    return Response.json({
      ok: true,
      packId: saved.packId,
      count: saved.count,
      property: pack.property,
      status: "proposed",
      applied: false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save that proposal pack.";
    return Response.json({ error: message }, { status: 400 });
  }
}
