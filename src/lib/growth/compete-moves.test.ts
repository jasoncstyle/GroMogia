import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

import {
  COMPETE_MOVE_SOURCE_OWNER,
  COMPETE_MOVE_STATUS_DONE,
  COMPETE_MOVE_STATUS_PLANNED,
  competeMovesToShow,
  describeCompeteMove,
  planCompeteMove,
  planCompeteMoveDone,
  suggestCompeteMoveFromCompare,
  suggestCompeteMoveFromGap,
} from "./compete-moves";

const ORG_A = "11111111-1111-1111-1111-111111111111";

describe("owner-saved compete moves", () => {
  it("plans a move the owner will do", () => {
    const draft = planCompeteMove({
      organizationId: ORG_A,
      title: "  Name private coaching on the class page  ",
      note: "  I will edit that page myself.  ",
    });
    assert.equal(draft.organizationId, ORG_A);
    assert.equal(draft.title, "Name private coaching on the class page");
    assert.equal(draft.note, "I will edit that page myself.");
    assert.equal(draft.status, COMPETE_MOVE_STATUS_PLANNED);
    assert.equal(draft.source, COMPETE_MOVE_SOURCE_OWNER);
    assert.equal(
      describeCompeteMove({
        title: "Name private coaching on the class page",
        note: "I will edit that page myself.",
      }),
      "You will: “Name private coaching on the class page”. I will edit that page myself.",
    );
    assert.match(
      describeCompeteMove({
        title: "Name private coaching on the class page",
        note: "",
      }),
      /has not done this/,
    );
    assert.equal(
      competeMovesToShow(
        new Array(15).fill(null).map((_, index) => ({
          id: String(index),
          title: "Name private coaching on the class page",
          note: "",
          createdAt: new Date(0),
        })),
      ).length,
      12,
    );
  });

  it("requires an organization and what the owner will do", () => {
    assert.throws(
      () => planCompeteMove({ organizationId: "", title: "Write a page" }),
      /Missing organization/,
    );
    assert.throws(
      () => planCompeteMove({ organizationId: ORG_A, title: "   " }),
      /Say what you will do/,
    );
  });

  it("does not fetch, publish, execute, or create a Next step", () => {
    const helper = readFileSync(
      join(process.cwd(), "src/lib/growth/compete-moves.ts"),
      "utf8",
    );
    const action = readFileSync(
      join(process.cwd(), "src/lib/actions/compete-moves.ts"),
      "utf8",
    );
    const panel = readFileSync(
      join(process.cwd(), "src/components/competitor-sites-panel.tsx"),
      "utf8",
    );
    const nextStep = readFileSync(
      join(process.cwd(), "src/lib/growth/next-step.ts"),
      "utf8",
    );
    for (const source of [helper, action, panel]) {
      assert.doesNotMatch(source, /fetch\(/);
      assert.doesNotMatch(source, /generateText|openai|anthropic/i);
      assert.doesNotMatch(source, /requestExecute|requestCmsPublish|competitorSearchEnabled/);
    }
    assert.match(action, /session\.organizationId/);
    assert.match(action, /did not do this/);
    assert.match(panel, /What I will do/);
    assert.match(panel, /createCompeteMove/);
    assert.match(panel, /completeCompeteMove/);
    assert.match(panel, /I did this/);
    assert.match(action, /eq\(competeMoves\.organizationId, session\.organizationId\)/);
    const done = planCompeteMoveDone({
      organizationId: ORG_A,
      moveId: "55555555-5555-5555-5555-555555555555",
    });
    assert.equal(done.status, COMPETE_MOVE_STATUS_DONE);
    assert.match(
      describeCompeteMove({
        title: "Name private coaching on the class page",
        note: "",
        status: COMPETE_MOVE_STATUS_DONE,
      }),
      /You did/,
    );
    assert.throws(
      () => planCompeteMoveDone({ organizationId: ORG_A, moveId: "" }),
      /Pick a saved move/,
    );
    assert.doesNotMatch(nextStep, /competeMove|compete_move|What I will do/);
    const seoPage = readFileSync(
      join(process.cwd(), "src/app/(app)/app/seo/page.tsx"),
      "utf8",
    );
    assert.match(seoPage, /competeMoves/);
    assert.doesNotMatch(
      JSON.stringify(planCompeteMove({ organizationId: ORG_A, title: "Write a page" })),
      /oceansailing|morsealpha|stripe-osa/i,
    );
    const fromGap = suggestCompeteMoveFromGap("  Weekend beginner class  ");
    assert.equal(fromGap.title, "Cover “Weekend beginner class” on our site");
    assert.match(fromGap.note, /will not do this/);
    assert.equal(suggestCompeteMoveFromGap("").title, "");
    assert.match(panel, /I will cover this/);
    assert.match(panel, /I will do this compare/);
    const fromCompare = suggestCompeteMoveFromCompare({
      ourLead: "Private coaching",
      theirLead: "Weekend beginner class",
    });
    assert.match(fromCompare.title, /Private coaching/);
    assert.match(fromCompare.title, /Weekend beginner class/);
    assert.match(fromCompare.note, /will not do this/);
    assert.equal(suggestCompeteMoveFromCompare(null).title, "");
  });
});
