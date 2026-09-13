import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

import {
  BOT_SEAT_BOOKS,
  BOT_SEAT_DRAFT,
  BOT_SEAT_WRITE,
  BOT_STATUS_APPROVED,
  BOT_STATUS_PROPOSED,
  BOT_STATUS_SHIPPED,
  describeBotInboxHeading,
  describeBotTeam,
  nextBotStatus,
  parseBotProposalPack,
  parseBotSeatPath,
} from "./bot-team";

const DRAFT_PACK = `{
  "property": "harbor-lessons",
  "source": "brand_voice",
  "items": [
    {
      "id": "reel-1",
      "type": "reel_script",
      "priority": "high",
      "evidence": "Saved offer weekday lessons. Audience wants a first time on the water.",
      "draft": "Weekday on the harbor. Book the first lesson."
    }
  ]
}`;

describe("bot team packs", () => {
  it("parses each seat and refuses shipped status from the bot", () => {
    const draft = parseBotProposalPack(DRAFT_PACK, BOT_SEAT_DRAFT);
    assert.equal(draft.seat, BOT_SEAT_DRAFT);
    assert.equal(draft.items[0]?.status, BOT_STATUS_PROPOSED);
    assert.equal(parseBotSeatPath("write"), BOT_SEAT_WRITE);
    assert.equal(parseBotSeatPath("scout"), null);
    const shipped = JSON.parse(DRAFT_PACK) as { items: Array<{ status?: string }> };
    shipped.items[0]!.status = "shipped";
    assert.throws(
      () => parseBotProposalPack(JSON.stringify(shipped), BOT_SEAT_DRAFT),
      /cannot mark work shipped/,
    );
    assert.throws(
      () => parseBotProposalPack(DRAFT_PACK, BOT_SEAT_BOOKS),
      /needs type categorize/,
    );
  });

  it("only ships after GroovGro has an approved item", () => {
    assert.equal(nextBotStatus(BOT_STATUS_PROPOSED, "approve"), BOT_STATUS_APPROVED);
    assert.equal(nextBotStatus(BOT_STATUS_APPROVED, "ship"), BOT_STATUS_SHIPPED);
    assert.throws(() => nextBotStatus(BOT_STATUS_PROPOSED, "ship"), /approved item/);
  });

  it("names the four live seats and keeps eggbot out of the data loop", () => {
    const team = describeBotTeam();
    assert.equal(team.seogro.status, "live");
    assert.equal(team.draftgro.status, "live");
    assert.equal(team.writegro.status, "live");
    assert.equal(team.booksgro.status, "live");
    assert.equal(team.eggbot.status, "out");
    assert.match(describeBotInboxHeading(BOT_SEAT_WRITE, { proposed: 1, approved: 0 }), /WRITEgro/);
  });

  it("connects DRAFTgro BOOKSgro and WRITEgro without sending or moving money", () => {
    const action = readFileSync(join(process.cwd(), "src/lib/actions/bot-team.ts"), "utf8");
    const route = readFileSync(join(process.cwd(), "src/app/api/bots/[seat]/route.ts"), "utf8");
    const page = readFileSync(join(process.cwd(), "src/app/(app)/app/bot-team/page.tsx"), "utf8");
    const panel = readFileSync(join(process.cwd(), "src/components/bot-access-panel.tsx"), "utf8");
    const schema = readFileSync(join(process.cwd(), "src/lib/db/ensure-schema.ts"), "utf8");
    assert.match(action, /parseBotProposalPack/);
    assert.doesNotMatch(action, /requestCmsPublish|requestExecute|googleapis/i);
    assert.match(route, /recordBotProposalPack/);
    assert.match(route, /getBotTeamPayload/);
    assert.doesNotMatch(route, /googleapis|requestCmsPublish/i);
    assert.match(page, /DRAFTgro, WRITEgro, and BOOKSgro/);
    assert.match(page, /api\/bots\//);
    assert.match(panel, /WRITEgro handoff/);
    assert.match(panel, /BOOKSgro handoff/);
    assert.match(schema, /0044_bot_proposal_packs/);
  });
});
