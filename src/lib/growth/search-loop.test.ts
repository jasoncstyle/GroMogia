import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

import {
  PASTE_SEARCH_LOOP_STEP_TITLE,
  SAVE_SEARCH_LOOP_BRIEF_STEP_TITLE,
  SEARCH_LOOP_STEP_DONE,
  SEARCH_LOOP_STEP_PASTE,
  SEARCH_LOOP_STEP_SAVE_BRIEF,
  SEARCH_LOOP_STEP_WAIT,
  SEARCH_LOOP_STEP_WRITE_DRAFT,
  WRITE_SEARCH_LOOP_DRAFT_STEP_TITLE,
  composeSearchLoopCheck,
  describeSearchLoopHeading,
  encodeSearchBaseline,
  learnFromSearchQuery,
  matchOfferToQuery,
  parseSearchBaseline,
  pickPastePage,
  pickSearchLoopTopic,
  planSearchLoop,
  searchLoopNextStep,
  writeSearchLoopPasteCopy,
} from "./search-loop";

const KEYWORD = {
  query: "harbor sailing lessons",
  queryKey: "harbor sailing lessons",
  opportunityLabel: "review" as const,
  opportunityScore: 80,
  impressions: 400,
  clicks: 12,
  position: 14,
  ctr: 0.03,
};

describe("search-to-page loop", () => {
  it("picks a missing-page worth-a-look query before a covered one", () => {
    const topic = pickSearchLoopTopic({
      keywords: [
        {
          ...KEYWORD,
          query: "already on the site",
          queryKey: "already on the site",
          opportunityScore: 90,
          impressions: 800,
        },
        KEYWORD,
      ],
      gaps: [{ query: "harbor sailing lessons", queryKey: "harbor sailing lessons" }],
    });
    assert.equal(topic?.query, "harbor sailing lessons");
  });

  it("skips a query already pasted and checked", () => {
    const topic = pickSearchLoopTopic({
      keywords: [KEYWORD],
      pastes: [
        {
          id: "paste-1",
          query: "harbor sailing lessons",
          result: "The owner did this.\n\nWhat changed: After you did this work, the Goal improved.",
        },
      ],
    });
    assert.equal(topic?.query, "harbor sailing lessons");
    const loop = planSearchLoop({
      keywords: [KEYWORD],
      pastes: [
        {
          id: "paste-1",
          query: "harbor sailing lessons",
          result: "The owner did this.\n\nWhat changed: After you did this work, the Goal improved.",
        },
      ],
    });
    assert.equal(loop.step, SEARCH_LOOP_STEP_DONE);
    assert.equal(searchLoopNextStep(loop), null);
  });

  it("walks brief, draft, then paste", () => {
    const start = planSearchLoop({
      keywords: [KEYWORD],
      gaps: [{ query: KEYWORD.query, queryKey: KEYWORD.queryKey }],
      offers: ["Harbor sailing lessons"],
      goal: { id: "goal-1", title: "More lesson bookings" },
      voice: {
        businessName: "Harbor Sailing Co",
        doSay: "Learn on the harbor.",
      },
    });
    assert.equal(start.step, SEARCH_LOOP_STEP_SAVE_BRIEF);
    assert.equal(start.offerName, "Harbor sailing lessons");
    assert.equal(start.goalTitle, "More lesson bookings");
    assert.equal(start.voice.businessName, "Harbor Sailing Co");
    assert.equal(start.voice.doSay, "Learn on the harbor.");
    assert.match(start.why, /Harbor sailing lessons/);
    assert.equal(start.nextStepTitle, SAVE_SEARCH_LOOP_BRIEF_STEP_TITLE);
    assert.match(describeSearchLoopHeading(start), /harbor sailing lessons/);

    const afterBrief = planSearchLoop({
      keywords: [KEYWORD],
      briefs: [{ id: "brief-1", query: KEYWORD.query, title: KEYWORD.query }],
    });
    assert.equal(afterBrief.step, SEARCH_LOOP_STEP_WRITE_DRAFT);
    assert.equal(afterBrief.nextStepTitle, WRITE_SEARCH_LOOP_DRAFT_STEP_TITLE);

    const afterDraft = planSearchLoop({
      keywords: [KEYWORD],
      briefs: [
        {
          id: "brief-1",
          query: KEYWORD.query,
          title: KEYWORD.query,
          draft: { id: "draft-1", title: KEYWORD.query, body: "Copy" },
        },
      ],
    });
    assert.equal(afterDraft.step, SEARCH_LOOP_STEP_PASTE);
    assert.equal(afterDraft.nextStepTitle, PASTE_SEARCH_LOOP_STEP_TITLE);
    assert.equal(searchLoopNextStep(afterDraft)?.href, "/app/seo");
  });

  it("waits when there is no worth-a-look query", () => {
    const loop = planSearchLoop({
      keywords: [{ ...KEYWORD, opportunityLabel: "watch" }],
    });
    assert.equal(loop.step, SEARCH_LOOP_STEP_WAIT);
    assert.match(loop.why, /will not invent a topic/);
    assert.equal(searchLoopNextStep(loop), null);
  });

  it("matches an offer only when the search shares a word", () => {
    assert.equal(
      matchOfferToQuery("harbor sailing lessons", ["Harbor sailing lessons", "Gift cards"]),
      "Harbor sailing lessons",
    );
    assert.equal(matchOfferToQuery("harbor sailing lessons", ["Gift cards"]), "");
  });

  it("names an existing page to improve or a new page to create", () => {
    const improve = pickPastePage("harbor sailing lessons", [
      {
        url: "https://example.com/lessons",
        title: "Harbor sailing lessons",
        headings: ["Harbor sailing lessons"],
      },
    ]);
    assert.equal(improve?.kind, "improve");
    assert.match(improve?.url ?? "", /lessons/);

    const create = pickPastePage("weekend beginner class", [
      {
        url: "https://example.com/",
        title: "Home",
        headings: ["Welcome"],
      },
    ]);
    assert.equal(create?.kind, "create");
    assert.equal(create?.url, "https://example.com/");
  });

  it("writes paste-ready copy from saved facts without inventing prices or reviews", () => {
    const copy = writeSearchLoopPasteCopy({
      query: "harbor sailing lessons",
      title: "Harbor sailing lessons",
      audience: "New guests",
      outline: "What the first lesson includes.",
      offerName: "Harbor sailing lessons",
      page: {
        url: "https://example.com/lessons",
        label: "Lessons",
        kind: "improve",
      },
      businessName: "Harbor Sailing Co",
      difference: "Smaller groups on the water.",
      doSay: "Learn on the harbor.",
      dontSay: "guaranteed ranking",
      tone: "calm and clear",
      exampleTitle: "First-lesson welcome",
      exampleBody: "Come as you are. We start on the dock.",
    });
    assert.match(copy, /Harbor Sailing Co helps people looking for harbor sailing lessons/);
    assert.match(copy, /The offer is Harbor sailing lessons/);
    assert.match(copy, /Smaller groups on the water/);
    assert.match(copy, /Learn on the harbor/);
    assert.match(copy, /Do not say: guaranteed ranking/);
    assert.match(copy, /Tone: calm and clear/);
    assert.match(copy, /First-lesson welcome/);
    assert.match(copy, /Come as you are/);
    assert.match(copy, /https:\/\/example.com\/lessons/);
    assert.match(copy, /has not published/);
    assert.doesNotMatch(copy, /\$\d|5-star|Jane Doe/i);
  });

  it("compares stored Search Console numbers without changing course", () => {
    const baseline = parseSearchBaseline(
      encodeSearchBaseline("harbor sailing lessons", {
        impressions: 400,
        clicks: 12,
        position: 14,
        ctr: 0.03,
      }),
    );
    assert.ok(baseline);
    assert.equal(baseline.query, "harbor sailing lessons");
    const tooSoon = learnFromSearchQuery({
      query: "harbor sailing lessons",
      baseline,
      current: { impressions: 410, clicks: 20, position: 11, ctr: 0.05 },
      daysSinceDone: 2,
    });
    assert.equal(tooSoon.kind, "too_soon");
    assert.match(tooSoon.outcome, /Wait before changing course/);
    const improved = learnFromSearchQuery({
      query: "harbor sailing lessons",
      baseline,
      current: { impressions: 410, clicks: 20, position: 11, ctr: 0.05 },
      daysSinceDone: 8,
    });
    assert.equal(improved.kind, "improved");
    assert.match(improved.outcome, /not a reason to start ads/);
    const combined = composeSearchLoopCheck(
      "After you did this work, “More lesson bookings” improved.",
      improved.outcome,
    );
    assert.match(combined, /More lesson bookings/);
    assert.match(combined, /harbor sailing lessons/);
  });

  it("keeps the loop on SEO and Next step without publishing or scraping", () => {
    const helper = readFileSync(join(process.cwd(), "src/lib/growth/search-loop.ts"), "utf8");
    const panel = readFileSync(
      join(process.cwd(), "src/components/search-loop-panel.tsx"),
      "utf8",
    );
    const action = readFileSync(
      join(process.cwd(), "src/lib/actions/search-loop.ts"),
      "utf8",
    );
    const query = readFileSync(
      join(process.cwd(), "src/lib/growth/search-loop-query.ts"),
      "utf8",
    );
    const seoPage = readFileSync(
      join(process.cwd(), "src/app/(app)/app/seo/page.tsx"),
      "utf8",
    );
    const nextStep = readFileSync(
      join(process.cwd(), "src/lib/growth/next-step.ts"),
      "utf8",
    );
    assert.match(helper, /does not publish/);
    assert.match(helper, /scrape Google/);
    assert.match(panel, /markSearchLoopPasted/);
    assert.match(panel, /createContentBrief/);
    assert.match(panel, /createContentDraft/);
    assert.match(panel, /saved facts and brand voice/);
    assert.match(panel, /loop\.voice\.doSay/);
    assert.match(action, /completed_by_owner/);
    assert.match(action, /did not publish/);
    assert.doesNotMatch(action, /requestCmsPublish|requestExecute|requestCompetitorSearch/);
    assert.match(seoPage, /SearchLoopPanel/);
    assert.match(nextStep, /searchLoopNextStep/);
    assert.match(query, /brandVoiceProfiles/);
    assert.match(query, /more_like_this/);
    assert.doesNotMatch(helper, /fetch\(/);
    assert.doesNotMatch(helper, /generateText|openai|anthropic/i);
  });
});
