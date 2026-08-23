import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { DEFAULT_EVIDENCE_POLICIES } from "./types";
import { buildSpecialistReports, type SpecialistFacts } from "./specialists";
import { coordinateNextStep, isWaitingActionStatus } from "./next-step";

const now = new Date("2026-08-23T12:00:00.000Z");

function facts(overrides: Partial<SpecialistFacts> = {}): SpecialistFacts {
  return {
    now,
    goals: [],
    inferredDraftCount: 0,
    policies: [...DEFAULT_EVIDENCE_POLICIES],
    websiteConnected: true,
    websiteUrl: "https://example.com",
    seoScore: 80,
    seoSummary: "Clear starting place",
    seoFailCount: 0,
    seoWarnCount: 0,
    seoCheckedAt: now,
    searchConsoleConnected: false,
    openLeadCount: 0,
    upcomingEventCount: 0,
    evidenceSample: { elapsedDays: 2, observations: 3, conversions: 0 },
    advertisingConnected: false,
    emailConnected: false,
    socialConnected: false,
    ...overrides,
  };
}

describe("coordinated next step", () => {
  it("asks the owner to confirm drafts before other work", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 2,
      reports: buildSpecialistReports(facts({ inferredDraftCount: 2, openLeadCount: 4 })),
      waitingActions: [],
    });
    assert.equal(step.primary.href, "/app/business");
    assert.equal(step.primary.classification, "operational");
    assert.equal(step.executeAllowed, false);
    assert.match(step.primary.body, /will not start marketing/);
  });

  it("picks follow-up of open leads over disconnected ad channels", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts({ openLeadCount: 3 })),
      waitingActions: [],
    });
    assert.equal(step.primary.href, "/app/crm");
    assert.match(step.primary.title, /leads/i);
    assert.equal(
      step.leftAlone.some((item) => /ads/i.test(item.title) || /advertising/i.test(item.body)),
      true,
    );
  });

  it("says nothing should change when evidence is thin and work is current", () => {
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts()),
      waitingActions: [],
    });
    assert.equal(step.primary.kind, "no_change_yet");
    assert.match(step.primary.body, /will not start ads/);
  });

  it("lists proposed actions as waiting without treating them as executed", () => {
    assert.equal(isWaitingActionStatus("proposed"), true);
    assert.equal(isWaitingActionStatus("approved"), false);
    const step = coordinateNextStep({
      inferredDraftCount: 0,
      reports: buildSpecialistReports(facts()),
      waitingActions: [
        {
          id: "a1",
          description: "Follow up open leads.",
          module: "crm",
          status: "proposed",
          risk: "operational",
        },
      ],
    });
    assert.equal(step.waitingActions.length, 1);
    assert.equal(step.executeAllowed, false);
  });

  it("does not bake industry-specific words into the coordinator", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/growth/next-step.ts"), "utf8");
    for (const banned of ["seat", "boat", "student", "ticket", "sailing", "bunk", "electrician"]) {
      assert.equal(source.toLowerCase().includes(banned), false, banned);
    }
  });
});
