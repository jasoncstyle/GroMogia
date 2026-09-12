import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

import { CONTENT_BRIEF_SOURCE_COMPETITOR_GAP } from "./content-briefs";
import {
  CONTENT_DRAFT_SOURCE_STORED_BRIEF,
  CONTENT_DRAFT_STATUS_DRAFT,
  DRAFT_DIFFERENCE_CHECK_MISSING,
  DRAFT_DIFFERENCE_CHECK_NAMES,
  DRAFT_DIFFERENCE_CHECK_NO,
  DRAFT_OFFER_CHECK_MISSING_OFFER,
  DRAFT_OFFER_CHECK_NAMES_AN_OFFER,
  DRAFT_OFFER_CHECK_NO_OFFER,
  countDraftDifferenceChecks,
  countDraftOfferChecks,
  describeDraftDifferenceCheck,
  describeDraftOfferCheck,
  planContentDraft,
  planDraftDifferenceChecks,
  planDraftOfferChecks,
  writeDraftFromBrief,
} from "./content-drafts";

const ORG_A = "11111111-1111-1111-1111-111111111111";
const BRIEF_A = "33333333-3333-3333-3333-333333333333";

describe("workspace drafts from saved briefs", () => {
  it("writes a workspace draft only from the saved brief", () => {
    const draft = planContentDraft({
      organizationId: ORG_A,
      briefId: BRIEF_A,
      title: "Weekend beginner class",
      query: "weekend beginner class",
      audience: "New guests",
      outline: "What to expect on the first visit.",
    });
    assert.equal(draft.organizationId, ORG_A);
    assert.equal(draft.briefId, BRIEF_A);
    assert.equal(draft.title, "Weekend beginner class");
    assert.equal(draft.source, CONTENT_DRAFT_SOURCE_STORED_BRIEF);
    assert.equal(draft.status, CONTENT_DRAFT_STATUS_DRAFT);
    assert.match(draft.body, /Weekend beginner class/);
    assert.match(draft.body, /weekend beginner class/);
    assert.match(draft.body, /New guests/);
    assert.match(draft.body, /What to expect on the first visit/);
    assert.match(draft.body, /has not published/);
    assert.doesNotMatch(draft.body, /\$\d|5-star|Jane Doe/i);
  });

  it("does not invent coverage when the brief has no outline", () => {
    const body = writeDraftFromBrief({
      organizationId: ORG_A,
      briefId: BRIEF_A,
      title: "Harbor tours",
    });
    assert.match(body, /did not say what to cover yet/);
    assert.match(body, /will not invent prices/);
    const fromGap = writeDraftFromBrief({
      organizationId: ORG_A,
      briefId: BRIEF_A,
      title: "Weekend beginner class",
      briefSource: CONTENT_BRIEF_SOURCE_COMPETITOR_GAP,
      ourOffers: ["  Private coaching  "],
      ourDifference: ["Smaller groups"],
    });
    assert.match(fromGap, /Do not copy a competitor/);
    assert.match(fromGap, /Private coaching/);
    assert.match(fromGap, /Smaller groups/);
    assert.doesNotMatch(fromGap, /\$\d|5-star|Jane Doe/i);
  });

  it("requires an organization, brief, and title", () => {
    assert.throws(
      () =>
        planContentDraft({
          organizationId: "",
          briefId: BRIEF_A,
          title: "Harbor tours",
        }),
      /Missing organization/,
    );
    assert.throws(
      () =>
        planContentDraft({
          organizationId: ORG_A,
          briefId: "",
          title: "Harbor tours",
        }),
      /Pick a saved brief/,
    );
    assert.throws(
      () =>
        planContentDraft({
          organizationId: ORG_A,
          briefId: BRIEF_A,
          title: "   ",
        }),
      /working title/,
    );
  });

  it("does not fetch, call a model, publish, or create a Next step", () => {
    const helper = readFileSync(
      join(process.cwd(), "src/lib/growth/content-drafts.ts"),
      "utf8",
    );
    const action = readFileSync(
      join(process.cwd(), "src/lib/actions/content-drafts.ts"),
      "utf8",
    );
    const panel = readFileSync(
      join(process.cwd(), "src/components/content-briefs-panel.tsx"),
      "utf8",
    );
    const nextStep = readFileSync(
      join(process.cwd(), "src/lib/growth/next-step.ts"),
      "utf8",
    );
    for (const source of [helper, action, panel]) {
      assert.doesNotMatch(source, /fetch\(/);
      assert.doesNotMatch(source, /generateText|openai|anthropic/i);
    }
    assert.match(action, /session\.organizationId/);
    assert.match(action, /eq\(contentBriefs\.organizationId, session\.organizationId\)/);
    assert.match(action, /did not publish/);
    assert.match(action, /briefSource: brief\.source/);
    assert.match(action, /ourOffers/);
    assert.match(panel, /Write a workspace draft/);
    assert.match(panel, /this business’s words/);
    assert.match(panel, /will not publish/);
    assert.match(panel, /Save for later review/);
    assert.match(panel, /createCmsPublishRequest/);
    assert.match(panel, /Where you already publish/);
    assert.doesNotMatch(nextStep, /contentDraft|content_draft|Write a workspace draft/);
    const seoPage = readFileSync(
      join(process.cwd(), "src/app/(app)/app/seo/page.tsx"),
      "utf8",
    );
    assert.match(seoPage, /draft from a competitor topic/);
    assert.match(seoPage, /names a saved offer/);
    assert.match(seoPage, /listed first/);
    assert.match(seoPage, /Queries worth a look are listed first/);
    assert.match(seoPage, /Looks that moved down are listed first/);
    assert.match(seoPage, /Names that still need a note are listed first/);
    assert.match(seoPage, /queuedReviews/);
    assert.match(panel, /describeCmsPublishRequest/);
    assert.match(seoPage, /later review from[\s\S]*the planner/);
    assert.match(seoPage, /still need later review are listed first/);
    assert.match(panel, /describeDraftOfferCheck/);
    assert.match(panel, /describeDraftDifferenceCheck/);
    assert.match(seoPage, /what makes you different|what makes this business different/);
    assert.doesNotMatch(helper, /requestCompetitorSearch|geoLookupEnabled|cmsPublishEnabled/);
  });

  it("checks a competitor-topic draft against saved offers", () => {
    const drafts = [
      {
        id: "dddddddd-dddd-dddd-dddd-ddddddddddd1",
        briefId: BRIEF_A,
        title: "Weekend beginner class",
        body: writeDraftFromBrief({
          organizationId: ORG_A,
          briefId: BRIEF_A,
          title: "Weekend beginner class",
          briefSource: CONTENT_BRIEF_SOURCE_COMPETITOR_GAP,
          ourOffers: ["Private coaching"],
        }),
      },
      {
        id: "dddddddd-dddd-dddd-dddd-ddddddddddd2",
        briefId: "44444444-4444-4444-4444-444444444444",
        title: "Harbor tours",
        body: "A workspace draft about harbor tours.",
      },
    ];
    const briefs = [
      { id: BRIEF_A, source: CONTENT_BRIEF_SOURCE_COMPETITOR_GAP },
      { id: "44444444-4444-4444-4444-444444444444", source: "owner" },
    ];
    const named = planDraftOfferChecks({
      drafts,
      briefs,
      offers: ["  Private coaching  "],
    });
    assert.equal(named.length, 1);
    assert.equal(named[0]?.status, DRAFT_OFFER_CHECK_NAMES_AN_OFFER);
    assert.deepEqual(named[0]?.namedOffers, ["Private coaching"]);
    assert.match(describeDraftOfferCheck(named[0]!), /Private coaching/);
    assert.match(describeDraftOfferCheck(named[0]!), /did not publish/);

    const missing = planDraftOfferChecks({
      drafts: [
        {
          id: "dddddddd-dddd-dddd-dddd-ddddddddddd3",
          briefId: BRIEF_A,
          title: "Weekend beginner class",
          body: "Cover what a competitor site showed. Do not copy their words.",
        },
      ],
      briefs,
      offers: ["Private coaching"],
    });
    assert.equal(missing[0]?.status, DRAFT_OFFER_CHECK_MISSING_OFFER);
    assert.match(describeDraftOfferCheck(missing[0]!), /does not name a saved offer/);

    const none = planDraftOfferChecks({
      drafts,
      briefs,
      offers: [],
    });
    assert.equal(none[0]?.status, DRAFT_OFFER_CHECK_NO_OFFER);
    assert.match(describeDraftOfferCheck(none[0]!), /Save what you sell/);
    assert.deepEqual(countDraftOfferChecks(named), {
      checked: 1,
      namesAnOffer: 1,
      missingOffer: 0,
      noOfferToCheck: 0,
    });
    assert.equal(planDraftOfferChecks({ drafts, briefs: [] }).length, 0);
    assert.doesNotMatch(
      JSON.stringify(named),
      /oceansailing|morsealpha|stripe-osa/i,
    );
  });

  it("checks a competitor-topic draft against what makes the business different", () => {
    const briefs = [
      { id: BRIEF_A, source: CONTENT_BRIEF_SOURCE_COMPETITOR_GAP },
    ];
    const named = planDraftDifferenceChecks({
      drafts: [
        {
          id: "dddddddd-dddd-dddd-dddd-ddddddddddd4",
          briefId: BRIEF_A,
          title: "Weekend beginner class",
          body: writeDraftFromBrief({
            organizationId: ORG_A,
            briefId: BRIEF_A,
            title: "Weekend beginner class",
            briefSource: CONTENT_BRIEF_SOURCE_COMPETITOR_GAP,
            ourDifference: ["Smaller groups"],
          }),
        },
      ],
      briefs,
      differences: ["  Smaller groups  "],
    });
    assert.equal(named[0]?.status, DRAFT_DIFFERENCE_CHECK_NAMES);
    assert.deepEqual(named[0]?.namedDifferences, ["Smaller groups"]);
    assert.match(describeDraftDifferenceCheck(named[0]!), /Smaller groups/);

    const missing = planDraftDifferenceChecks({
      drafts: [
        {
          id: "dddddddd-dddd-dddd-dddd-ddddddddddd5",
          briefId: BRIEF_A,
          title: "Weekend beginner class",
          body: "Cover what a competitor site showed.",
        },
      ],
      briefs,
      differences: ["Smaller groups"],
    });
    assert.equal(missing[0]?.status, DRAFT_DIFFERENCE_CHECK_MISSING);
    assert.match(describeDraftDifferenceCheck(missing[0]!), /does not name what makes/);

    const none = planDraftDifferenceChecks({
      drafts: [
        {
          id: "dddddddd-dddd-dddd-dddd-ddddddddddd6",
          briefId: BRIEF_A,
          title: "Weekend beginner class",
          body: "A workspace draft.",
        },
      ],
      briefs,
      differences: [],
    });
    assert.equal(none[0]?.status, DRAFT_DIFFERENCE_CHECK_NO);
    assert.match(describeDraftDifferenceCheck(none[0]!), /Save that on Business/);
    assert.deepEqual(countDraftDifferenceChecks(named), {
      checked: 1,
      namesADifference: 1,
      missingDifference: 0,
      noDifferenceToCheck: 0,
    });
  });
});
