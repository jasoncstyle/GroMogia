import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

import {
  CHANNEL_IDS,
  CHANNEL_SCORE_SOURCE_STORED,
  channelScoreLabelTitle,
  describeChannelScoreHeading,
  channelsWithEvidence,
  compareChannelScores,
  planChannelScores,
  scoreGrowthChannels,
  scoresToShow,
  type ChannelScoreFacts,
} from "./channel-score";

const ORG_A = "11111111-1111-1111-1111-111111111111";

function facts(overrides: Partial<ChannelScoreFacts> = {}): ChannelScoreFacts {
  return {
    openLeadCount: 0,
    proposedSeoActionCount: 0,
    keywordReviewCount: 0,
    contentGapCount: 0,
    contentBriefCount: 0,
    contentDraftCount: 0,
    geoAuditGapCount: 0,
    ...overrides,
  };
}

describe("cross-channel opportunity scoring", () => {
  it("keeps empty channels as not enough evidence", () => {
    const scored = scoreGrowthChannels(facts());
    assert.equal(scored.length, 4);
    assert.deepEqual(
      scored.map((row) => row.label),
      ["none", "none", "none", "none"],
    );
    assert.equal(channelsWithEvidence(scored).length, 0);
    assert.match(scored[0]?.why ?? "", /not a traffic or revenue forecast/);
    assert.equal(scored[0]?.confidence, "inferred");
    assert.equal(scored[0]?.source, CHANNEL_SCORE_SOURCE_STORED);
    assert.equal(channelScoreLabelTitle("none"), "Not enough evidence");
  });

  it("watches small stored counts and reviews larger ones", () => {
    const watched = scoreGrowthChannels(facts({ openLeadCount: 2 }));
    const peopleWatch = watched.find((row) => row.channel === "people");
    assert.equal(peopleWatch?.label, "watch");
    assert.equal(channelScoreLabelTitle("watch"), "Keep watching");
    assert.match(peopleWatch?.why ?? "", /2 open people/);
    assert.match(peopleWatch?.why ?? "", /not enough evidence yet/);

    const reviewed = scoreGrowthChannels(
      facts({
        openLeadCount: 4,
        proposedSeoActionCount: 2,
        keywordReviewCount: 2,
        contentGapCount: 3,
        geoAuditGapCount: 1,
      }),
    );
    assert.equal(reviewed.find((row) => row.channel === "people")?.label, "review");
    assert.equal(reviewed.find((row) => row.channel === "pages")?.label, "review");
    assert.equal(reviewed.find((row) => row.channel === "content")?.label, "review");
    assert.equal(
      reviewed.find((row) => row.channel === "ai_visibility")?.label,
      "watch",
    );
    assert.equal(channelScoreLabelTitle("review"), "Worth a look");
    assert.match(
      reviewed.find((row) => row.channel === "pages")?.why ?? "",
      /2 proposed SEO actions/,
    );
    assert.match(
      reviewed.find((row) => row.channel === "content")?.why ?? "",
      /3 queries with no matching page/,
    );
    assert.match(
      reviewed.find((row) => row.channel === "ai_visibility")?.why ?? "",
      /1 citation or mention gap/,
    );
  });

  it("sorts review above watch above none and caps the comparison", () => {
    const rows = scoreGrowthChannels(
      facts({
        openLeadCount: 5,
        proposedSeoActionCount: 1,
        contentGapCount: 0,
        geoAuditGapCount: 2,
      }),
    );
    const shown = scoresToShow(rows);
    assert.equal(shown.length, 4);
    assert.deepEqual(
      shown.map((row) => row.channel),
      ["people", "ai_visibility", "pages", "content"],
    );
    const sorted = [...rows].sort(compareChannelScores);
    assert.equal(sorted[0]?.channel, "people");
    assert.equal(sorted[1]?.channel, "ai_visibility");
  });

  it("does not invent scores without an organization", () => {
    const missingOrg = planChannelScores({
      organizationId: "",
      facts: facts({ openLeadCount: 4 }),
    });
    assert.equal(missingOrg.toUpsert.length, 0);
    assert.equal(missingOrg.skipped[0]?.reason, "tenant_mismatch");

    const planned = planChannelScores({
      organizationId: ORG_A,
      facts: facts({ openLeadCount: 4 }),
    });
    assert.equal(planned.toUpsert.length, 4);
    assert.equal(planned.toUpsert[0]?.organizationId, ORG_A);
  });

  it("does not fetch, buy ads, execute, or reorder Next step", () => {
    assert.deepEqual([...CHANNEL_IDS], [
      "people",
      "pages",
      "content",
      "ai_visibility",
    ]);
    assert.equal(CHANNEL_IDS.includes("advertising" as never), false);
    assert.equal(CHANNEL_IDS.includes("email" as never), false);
    assert.equal(CHANNEL_IDS.includes("social" as never), false);

    const helper = readFileSync(
      join(process.cwd(), "src/lib/growth/channel-score.ts"),
      "utf8",
    );
    const persist = readFileSync(
      join(process.cwd(), "src/lib/growth/persist-channel-scores.ts"),
      "utf8",
    );
    const panel = readFileSync(
      join(process.cwd(), "src/components/channel-score-panel.tsx"),
      "utf8",
    );
    const nextStep = readFileSync(
      join(process.cwd(), "src/lib/growth/next-step.ts"),
      "utf8",
    );
    const nextStepPage = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const intelligence = readFileSync(
      join(process.cwd(), "src/app/(app)/app/intelligence/page.tsx"),
      "utf8",
    );
    for (const source of [helper, persist, panel]) {
      assert.doesNotMatch(source, /fetch\(/);
      assert.doesNotMatch(source, /cheerio|puppeteer|playwright|openai|anthropic/i);
      assert.doesNotMatch(
        source,
        /wordpress|shopify|wp-json|chatgpt|perplexity/i,
      );
      assert.doesNotMatch(source, /buy ads|google ads|executeAllowed:\s*true/i);
    }
    assert.match(persist, /eq\(channelScores\.organizationId, organizationId\)/);
    assert.match(persist, /eq\(leadRecords\.organizationId, organizationId\)/);
    assert.match(persist, /eq\(growthActions\.organizationId, organizationId\)/);
    assert.match(panel, /will not change today/);
    assert.match(panel, /listed first/);
    assert.match(panel, /describeChannelScoreHeading/);
    assert.equal(
      describeChannelScoreHeading(0),
      "What stored evidence says to compare",
    );
    assert.equal(
      describeChannelScoreHeading(3),
      "What stored evidence says to compare · 3",
    );
    assert.equal(
      describeChannelScoreHeading(3, 1),
      "What stored evidence says to compare · 3 · 1 worth a look",
    );
    assert.match(panel, /Next step from this estimate/);
    assert.match(panel, /buy\s+ads, or run work/);
    assert.match(intelligence, /ChannelScorePanel/);
    assert.match(intelligence, /Channels worth a look are listed first/);
    assert.match(nextStepPage, /ChannelScorePanel/);
    assert.doesNotMatch(nextStep, /channelScore|channel_score|scoreGrowthChannels/);
    assert.match(
      nextStep,
      /drafts \?\? ownerWork \?\? checkChanged \?\? reviewSite \?\? activate \?\? draftPlan \?\? approvePlan \?\? proposeActions \?\? waitingApprove \?\? learning/,
    );
    const catalog = readFileSync(
      join(process.cwd(), "src/lib/modules/catalog.ts"),
      "utf8",
    );
    assert.doesNotMatch(catalog, /channel_score|ai_visibility/);
  });
});
