import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildGrowthStory } from "./story";

describe("growth story", () => {
  it("tells the path from Goal to next step without starting marketing", () => {
    const beats = buildGrowthStory({
      businessName: "Harbor Workshops",
      goalTitle: "More people get in touch",
      goalCurrent: 2,
      goalTarget: 10,
      goalUnit: "leads",
      goalProgressPercent: 20,
      hasApprovedPlan: true,
      planVersion: 2,
      openWorkCount: 1,
      finishedWorkCount: 0,
      latestLearning: "",
      nextStepTitle: "Do the work you already approved",
      nextStepBody: "You do it. GroovGro will not run it.",
      nextStepHref: "/app/work",
    });

    assert.equal(beats.length, 5);
    assert.match(beats[0]?.body ?? "", /Harbor Workshops/);
    assert.match(beats[0]?.body ?? "", /More people get in touch/);
    assert.match(beats[0]?.body ?? "", /2 leads of 10 leads/);
    assert.match(beats[1]?.body ?? "", /v2/);
    assert.equal(beats[0]?.href, "/app/goals");
    assert.equal(beats[1]?.href, "/app/goals");
    assert.match(beats[2]?.body ?? "", /will not run/);
    assert.match(beats[2]?.body ?? "", /Next step/);
    assert.equal(beats[2]?.href, "/app/next-step");
    assert.equal(beats[3]?.href, "/app/next-step");
    assert.equal(beats[4]?.href, "/app/next-step");
    assert.match(beats[4]?.body ?? "", /left alone/);
    assert.doesNotMatch(beats.map((beat) => beat.body).join(" "), /buy ads|TODO|lorem/i);
  });

  it("tells the owner to start with a Goal when nothing exists yet", () => {
    const beats = buildGrowthStory({
      businessName: "North Desk",
      goalTitle: "",
      goalCurrent: null,
      goalTarget: null,
      goalUnit: "",
      goalProgressPercent: null,
      hasApprovedPlan: false,
      planVersion: null,
      openWorkCount: 0,
      finishedWorkCount: 0,
      latestLearning: "",
      nextStepTitle: "",
      nextStepBody: "",
      nextStepHref: "",
    });
    assert.match(beats[0]?.body ?? "", /No active Goal/);
    assert.equal(beats[0]?.href, "/app/next-step");
    assert.match(beats[1]?.body ?? "", /Open Next step or Goals first/);
    assert.equal(beats[1]?.href, "/app/next-step");
    assert.equal(beats[2]?.href, "/app/next-step");
    assert.equal(beats[4]?.href, "/app/next-step");
  });

  it("uses finished work and stored learning when there is nothing open", () => {
    const beats = buildGrowthStory({
      businessName: "Harbor Workshops",
      goalTitle: "More people get in touch",
      goalCurrent: 5,
      goalTarget: 10,
      goalUnit: "leads",
      goalProgressPercent: 50,
      hasApprovedPlan: true,
      planVersion: 1,
      openWorkCount: 0,
      finishedWorkCount: 2,
      latestLearning: "Wait before changing course. Do not change the plan.",
      nextStepTitle: "Nothing should change yet",
      nextStepBody: "Keep collecting evidence.",
      nextStepHref: "/app/work",
    });
    assert.match(beats[2]?.body ?? "", /marked 2 actions/);
    assert.match(beats[2]?.body ?? "", /Next step/);
    assert.equal(beats[2]?.href, "/app/next-step");
    assert.equal(beats[3]?.href, "/app/next-step");
    assert.match(beats[3]?.body ?? "", /Wait before changing course/);
  });

  it("sends the owner to Next step instead of skipping to another page", () => {
    const beats = buildGrowthStory({
      businessName: "Harbor Workshops",
      goalTitle: "More people get in touch",
      goalCurrent: 2,
      goalTarget: 10,
      goalUnit: "leads",
      goalProgressPercent: 20,
      hasApprovedPlan: true,
      planVersion: 1,
      openWorkCount: 0,
      finishedWorkCount: 0,
      latestLearning: "",
      nextStepTitle: "Follow up open leads",
      nextStepBody: "Open Leads & customers. GroovGro will not email them.",
      nextStepHref: "/app/crm",
    });
    assert.equal(beats[4]?.href, "/app/next-step");
    assert.equal(beats[2]?.href, "/app/next-step");
    assert.match(beats[4]?.body ?? "", /Follow up open leads/);
  });

  it("names Next step on the path, specialists, and Intelligence", () => {
    const storyCard = readFileSync(
      join(process.cwd(), "src/components/growth-story.tsx"),
      "utf8",
    );
    const specialists = readFileSync(
      join(process.cwd(), "src/components/specialist-reports.tsx"),
      "utf8",
    );
    const intelligence = readFileSync(
      join(process.cwd(), "src/app/(app)/app/intelligence/page.tsx"),
      "utf8",
    );
    assert.match(storyCard, /Open Next step/);
    assert.match(specialists, /Open Next step/);
    assert.match(intelligence, /Open Next step/);
    assert.match(specialists, /Open related page/);
    assert.match(intelligence, /Open related page/);
  });

  it("does not bake industry-specific words into the story helper", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/growth/story.ts"), "utf8");
    for (const banned of ["seat", "boat", "student", "ticket", "sailing", "bunk", "electrician"]) {
      assert.equal(source.toLowerCase().includes(banned), false, banned);
    }
  });
});
