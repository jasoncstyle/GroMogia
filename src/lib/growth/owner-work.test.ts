import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  hrefForGrowthAction,
  isFinishedOwnerWork,
  isOpenOwnerWork,
  needsWhatChangedCheck,
  partitionOwnerWork,
} from "./owner-work";

describe("owner work", () => {
  it("sends the owner to the page they can do themselves", () => {
    assert.equal(
      hrefForGrowthAction({ actionType: "follow_up_leads", module: "crm" }),
      "/app/next-step",
    );
    assert.equal(
      hrefForGrowthAction({ actionType: "connect_website", module: "website" }),
      "/app/next-step",
    );
    assert.equal(
      hrefForGrowthAction({ actionType: "confirm_offers", module: "offers" }),
      "/app/next-step",
    );
    assert.equal(
      hrefForGrowthAction({ actionType: "watch_progress", module: "growth_goals" }),
      "/app/next-step",
    );
  });

  it("does not send ads, email, or social work to an execution page", () => {
    assert.equal(
      hrefForGrowthAction({ actionType: "start_ads", module: "advertising" }),
      "/app/next-step",
    );
    assert.equal(
      hrefForGrowthAction({ actionType: "send_email", module: "email" }),
      "/app/next-step",
    );
    assert.equal(
      hrefForGrowthAction({ actionType: "post_social", module: "social" }),
      "/app/next-step",
    );
  });

  it("treats approved actions as open work and owner marks as finished", () => {
    assert.equal(isOpenOwnerWork("approved"), true);
    assert.equal(isOpenOwnerWork("proposed"), false);
    assert.equal(isFinishedOwnerWork("completed_by_owner"), true);
    assert.equal(isFinishedOwnerWork("skipped_by_owner"), true);
    assert.equal(isFinishedOwnerWork("approved"), false);
  });

  it("asks for a check only after the owner marked work done and nothing is stored yet", () => {
    assert.equal(
      needsWhatChangedCheck({ status: "completed_by_owner", result: "The owner did this." }),
      true,
    );
    assert.equal(
      needsWhatChangedCheck({
        status: "completed_by_owner",
        result: "The owner did this.\n\nWhat changed: Wait before changing course.",
      }),
      false,
    );
    assert.equal(needsWhatChangedCheck({ status: "skipped_by_owner" }), false);
    assert.equal(needsWhatChangedCheck({ status: "approved" }), false);
  });

  it("partitions waiting, open, and finished work", () => {
    const parts = partitionOwnerWork([
      {
        id: "1",
        description: "Confirm drafts",
        status: "proposed",
        risk: "operational",
        actionType: "confirm_offers",
        module: "offers",
      },
      {
        id: "2",
        description: "Follow up leads",
        status: "approved",
        risk: "operational",
        actionType: "follow_up_leads",
        module: "crm",
      },
      {
        id: "3",
        description: "Done by the owner",
        status: "completed_by_owner",
        risk: "operational",
        actionType: "do_next_step",
        module: "growth_next",
      },
    ]);
    assert.equal(parts.waiting.length, 1);
    assert.equal(parts.open.length, 1);
    assert.equal(parts.finished.length, 1);
    assert.equal(parts.open[0]?.id, "2");
  });

  it("makes Next step the filled button on Your work", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/work/page.tsx"),
      "utf8",
    );
    assert.match(
      page,
      /<Button asChild>\s*<Link href="\/app\/next-step">Open Next step<\/Link>/,
    );
    assert.match(
      page,
      /variant="outline">\s*<Link href="\/app\/goals">Open the approved plan<\/Link>/,
    );
    assert.doesNotMatch(page, /Draft or approve a plan/);
  });

  it("does not bake industry-specific words into owner-work helpers", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/growth/owner-work.ts"), "utf8");
    for (const banned of ["seat", "boat", "student", "ticket", "sailing", "bunk", "electrician"]) {
      assert.equal(source.toLowerCase().includes(banned), false, banned);
    }
  });
});
