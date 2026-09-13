import { getAppSession } from "@/lib/auth/session";
import { appUrl } from "@/lib/env";
import { hasPermission } from "@/lib/permissions";
import {
  BOT_PATH_BY_SEAT,
  BOT_SEAT_BOOKS,
  BOT_SEAT_DRAFT,
  BOT_SEAT_WRITE,
  describeBotInboxHeading,
} from "@/lib/growth/bot-team";
import { getBotProposalInbox, getBotTeamPayload } from "@/lib/growth/bot-team-query";
import { BotTeamPanel } from "@/components/bot-team-panel";

export default async function BotTeamPage() {
  const session = await getAppSession();
  const canManage =
    hasPermission(session.permissions, "manage_integrations") ||
    hasPermission(session.permissions, "manage_seo");
  const orgId = session.organizationId ?? "";
  const seats = [BOT_SEAT_DRAFT, BOT_SEAT_WRITE, BOT_SEAT_BOOKS] as const;
  const desks = orgId
    ? await Promise.all(
        seats.map(async (seat) => {
          const [inbox, payload] = await Promise.all([
            getBotProposalInbox(orgId, seat),
            getBotTeamPayload(orgId, seat),
          ]);
          return { seat, inbox, sampleText: JSON.stringify(payload, null, 2) };
        }),
      )
    : seats.map((seat) => ({
        seat,
        inbox: { heading: describeBotInboxHeading(seat, { proposed: 0, approved: 0 }), items: [] },
        sampleText: "",
      }));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bot team</h1>
        <p className="text-muted-foreground">
          GroovGro talks to SEOgro, DRAFTgro, WRITEgro, and BOOKSgro. You review
          on Monday. You are not the courier. None of them send, publish, or
          move money. Point each bot at its handoff with the same desk token
          from Integrations.
        </p>
      </div>
      {!session.organizationId ? (
        <p className="text-sm text-muted-foreground">
          Sign in to open the bot team desk.
        </p>
      ) : (
        desks.map((desk) => (
          <BotTeamPanel
            key={desk.seat}
            seat={desk.seat}
            heading={desk.inbox.heading}
            items={desk.inbox.items}
            handoffUrl={`${appUrl()}/api/bots/${BOT_PATH_BY_SEAT[desk.seat]}`}
            sampleText={desk.sampleText}
            canManage={canManage}
          />
        ))
      )}
    </div>
  );
}
