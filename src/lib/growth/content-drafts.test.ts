import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

import { CONTENT_BRIEF_SOURCE_COMPETITOR_GAP } from "./content-briefs";
import {
  CONTENT_DRAFT_SOURCE_STORED_BRIEF,
  CONTENT_DRAFT_STATUS_DRAFT,
  planContentDraft,
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
    assert.doesNotMatch(nextStep, /contentDraft|content_draft|Write a workspace draft/);
    const seoPage = readFileSync(
      join(process.cwd(), "src/app/(app)/app/seo/page.tsx"),
      "utf8",
    );
    assert.match(seoPage, /draft from a competitor topic/);
  });
});
