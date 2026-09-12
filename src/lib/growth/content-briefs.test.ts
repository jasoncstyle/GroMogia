import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

import {
  CONTENT_BRIEF_SOURCE_COMPETITOR_GAP,
  CONTENT_BRIEF_SOURCE_OWNER,
  CONTENT_BRIEF_STATUS_PLANNED,
  describeContentBrief,
  hasSavedContentBriefForTopic,
  planContentBrief,
  plannerQuerySuggestions,
  refuseDuplicateContentBrief,
  suggestBriefOutline,
  suggestBriefOutlineFromCompetitorGap,
  suggestBriefTitle,
} from "./content-briefs";

const ORG_A = "11111111-1111-1111-1111-111111111111";

describe("owner-entered content briefs", () => {
  it("plans a brief from a stored query without writing a page", () => {
    const draft = planContentBrief({
      organizationId: ORG_A,
      query: "  Weekend beginner class  ",
      title: "  Weekend beginner class  ",
      audience: "  New guests  ",
      outline: "  What to expect on the first visit.  ",
    });
    assert.equal(draft.organizationId, ORG_A);
    assert.equal(draft.query, "Weekend beginner class");
    assert.equal(draft.queryKey, "weekend beginner class");
    assert.equal(draft.title, "Weekend beginner class");
    assert.equal(draft.audience, "New guests");
    assert.equal(draft.outline, "What to expect on the first visit.");
    assert.equal(draft.source, CONTENT_BRIEF_SOURCE_OWNER);
    assert.equal(draft.status, CONTENT_BRIEF_STATUS_PLANNED);
    assert.equal(
      describeContentBrief({
        query: draft.query,
        title: draft.title,
      }),
      "Planned: “Weekend beginner class” for “Weekend beginner class”.",
    );
    assert.equal(
      describeContentBrief({
        query: draft.query,
        title: draft.title,
        source: CONTENT_BRIEF_SOURCE_COMPETITOR_GAP,
      }),
      "Planned from a competitor topic: “Weekend beginner class” for “Weekend beginner class”.",
    );
  });

  it("uses the query as the working title when the title is empty", () => {
    const draft = planContentBrief({
      organizationId: ORG_A,
      query: "harbor tours",
    });
    assert.equal(draft.title, "harbor tours");
    assert.equal(suggestBriefTitle("  harbor tours  "), "harbor tours");
    assert.match(suggestBriefOutline("harbor tours"), /will not generate that page/);
    const fromGap = planContentBrief({
      organizationId: ORG_A,
      query: "Weekend beginner class",
      source: CONTENT_BRIEF_SOURCE_COMPETITOR_GAP,
      fromNames: ["Harbor Skills"],
    });
    assert.equal(fromGap.source, CONTENT_BRIEF_SOURCE_COMPETITOR_GAP);
    assert.match(fromGap.outline, /Harbor Skills/);
    assert.match(fromGap.outline, /Do not copy their words/);
    assert.match(
      suggestBriefOutlineFromCompetitorGap("Weekend beginner class", ["Harbor Skills"]),
      /will not generate or publish that page/,
    );
  });

  it("requires an organization and a title or query", () => {
    assert.throws(
      () => planContentBrief({ organizationId: "", title: "Harbor tours" }),
      /Missing organization/,
    );
    assert.throws(
      () => planContentBrief({ organizationId: ORG_A, title: "   " }),
      /Add a working title/,
    );
  });

  it("does not fetch, generate article copy, or create a Next step", () => {
    const helper = readFileSync(
      join(process.cwd(), "src/lib/growth/content-briefs.ts"),
      "utf8",
    );
    const action = readFileSync(
      join(process.cwd(), "src/lib/actions/content-briefs.ts"),
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
      assert.doesNotMatch(source, /generateText|openai|anthropic|cheerio/i);
    }
    assert.match(action, /session\.organizationId/);
    assert.match(action, /did not write a page/);
    assert.match(action, /fromNames/);
    assert.match(panel, /will not publish/);
    assert.doesNotMatch(nextStep, /contentBrief|content_brief|Save brief to planner|Save a brief for this topic/);
    const competitorPanel = readFileSync(
      join(process.cwd(), "src/components/competitor-sites-panel.tsx"),
      "utf8",
    );
    assert.match(competitorPanel, /Save a brief for this topic/);
    assert.match(competitorPanel, /competitor_gap/);
    const seoPage = readFileSync(
      join(process.cwd(), "src/app/(app)/app/seo/page.tsx"),
      "utf8",
    );
    assert.match(seoPage, /ContentBriefsPanel/);
    assert.match(seoPage, /briefs=\{data\.contentBriefs\}/);
    assert.match(competitorPanel, /Already saved on the planner/);
    assert.equal(
      hasSavedContentBriefForTopic(
        [{ query: "Weekend beginner class", title: "Weekend beginner class" }],
        "  weekend beginner class  ",
      ),
      true,
    );
    assert.equal(
      hasSavedContentBriefForTopic(
        [{ query: "Private coaching", title: "Private coaching" }],
        "Weekend beginner class",
      ),
      false,
    );
    assert.equal(hasSavedContentBriefForTopic([], "Weekend beginner class"), false);
    assert.throws(
      () =>
        refuseDuplicateContentBrief(
          [{ query: "Weekend beginner class", title: "Weekend beginner class" }],
          "weekend beginner class",
        ),
      /already on the planner/,
    );
    refuseDuplicateContentBrief(
      [{ query: "Private coaching", title: "Private coaching" }],
      "Weekend beginner class",
    );
    assert.match(action, /refuseDuplicateContentBrief/);
    assert.match(action, /eq\(contentBriefs\.organizationId, session\.organizationId\)/);
    assert.deepEqual(
      plannerQuerySuggestions(
        [
          "Weekend beginner class",
          "  weekend beginner class  ",
          "Private coaching",
        ],
        [{ query: "Weekend beginner class", title: "Weekend beginner class" }],
      ),
      ["Private coaching"],
    );
    assert.match(seoPage, /plannerQuerySuggestions/);
  });
});
