import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { DEFAULT_EVIDENCE_POLICIES } from "./types";
import { ADD_BRAND_VOICE_EXAMPLE_STEP_TITLE, ADD_OFFER_STEP_TITLE, CONNECT_SEARCH_CONSOLE_STEP_TITLE, CONNECT_STRIPE_STEP_TITLE, DRAFT_BRAND_VOICE_STEP_TITLE, FIX_SEO_STEP_TITLE, FOLLOW_UP_LEADS_STEP_TITLE, PASTE_SNIPPET_STEP_TITLE, PICK_SEARCH_CONSOLE_STEP_TITLE, REFRESH_SEARCH_CONSOLE_STEP_TITLE, RUN_SEO_STEP_TITLE, SAVE_BRAND_STEP_TITLE, SAVE_BRAND_VOICE_STEP_TITLE, SAVE_BUSINESS_STEP_TITLE, SAVE_PROGRESS_STEP_TITLE, SAVE_REVIEW_SCHEDULE_STEP_TITLE, SHARE_LEAD_FORM_STEP_TITLE, SYNC_STRIPE_STEP_TITLE } from "./plan-draft";
import {
  buildSpecialistReports,
  relatedGoalFor,
  specialistById,
  type SpecialistFacts,
} from "./specialists";

const now = new Date("2026-08-23T12:00:00.000Z");

function facts(overrides: Partial<SpecialistFacts> = {}): SpecialistFacts {
  return {
    now,
    goals: [],
    inferredDraftCount: 0,
    policies: [...DEFAULT_EVIDENCE_POLICIES],
    websiteConnected: true,
    websiteUrl: "https://example.com",
    seoScore: null,
    seoSummary: "",
    seoFailCount: 0,
    seoWarnCount: 0,
    seoCheckedAt: null,
    searchConsoleConnected: true,
    searchConsoleProperty: true,
    searchConsoleSnapshot: true,
    searchConsoleSnapshotAt: now,
    openLeadCount: 0,
    contactCount: 1,
    recordedVisitCount: 1,
    brandVoiceSaved: true,
    brandVoiceExampleSaved: true,
    brandVoiceDraftSaved: true,
    brandSettingsSaved: true,
    businessBrainSaved: true,
    goalProgressNeedsSave: false,
    stripeConfigured: true,
    stripeConnected: true,
    stripeSynced: true,
    growthScheduleSaved: true,
    confirmedOfferCount: 1,
    upcomingEventCount: 0,
    evidenceSample: { elapsedDays: 2, observations: 3, conversions: 0 },
    advertisingConnected: false,
    emailConnected: false,
    socialConnected: false,
    ...overrides,
  };
}

const visibilityGoal = {
  id: "g-vis",
  title: "Be easier to find",
  status: "active" as const,
  goalType: "visibility",
  liveCurrentValue: 0,
  targetValue: 10,
  progressPercent: 0,
  liveNote: "Updated by hand.",
};

const utilizationGoal = {
  id: "g-util",
  title: "Fill upcoming scheduled spots",
  status: "active" as const,
  goalType: "utilization",
  liveCurrentValue: 0,
  targetValue: 12,
  progressPercent: 0,
  liveNote: "0 of 12 upcoming spots are filled.",
};

describe("growth specialists", () => {
  it("links SEO to a visibility Goal and asks for a check when none exists", () => {
    const reports = buildSpecialistReports(
      facts({ goals: [visibilityGoal, utilizationGoal] }),
    );
    const seo = specialistById(reports, "seo");
    assert.ok(seo);
    assert.equal(seo.relatedGoal?.id, "g-vis");
    assert.equal(seo.recommend.kind, "recommend");
    assert.equal(seo.recommend.classification, "operational");
    assert.equal(seo.recommend.href, "/app/seo");
    assert.equal(seo.executeAllowed, false);
    assert.equal(seo.recommend.title, RUN_SEO_STEP_TITLE);
    assert.match(seo.recommend.body, /will not edit the website/);
  });

  it("recommends fixing blocking SEO items without executing them", () => {
    const seo = specialistById(
      buildSpecialistReports(
        facts({
          seoScore: 42,
          seoSummary: "Missing title and description.",
          seoFailCount: 2,
          seoWarnCount: 1,
          seoCheckedAt: now,
          goals: [visibilityGoal],
        }),
      ),
      "seo",
    );
    assert.ok(seo);
    assert.match(seo.read, /42 out of 100/);
    assert.equal(seo.recommend.title, FIX_SEO_STEP_TITLE);
    assert.match(seo.recommend.body, /Draft and approve/);
    assert.match(seo.recommend.body, /will not change the connected website/);
  });

  it("leaves SEO alone when the page is fine, Search Console is connected, and evidence is thin", () => {
    const seo = specialistById(
      buildSpecialistReports(
        facts({
          seoScore: 88,
          seoSummary: "Looks complete.",
          seoCheckedAt: now,
          seoFailCount: 0,
          seoWarnCount: 0,
          searchConsoleConnected: true,
        }),
      ),
      "seo",
    );
    assert.ok(seo);
    assert.equal(seo.recommend.kind, "no_change_yet");
    assert.match(seo.recommend.title, /Leave SEO alone/);
  });

  it("asks to connect Search Console after a homepage check when it is not connected", () => {
    const seo = specialistById(
      buildSpecialistReports(
        facts({
          seoScore: 88,
          seoSummary: "Looks complete.",
          seoCheckedAt: now,
          seoFailCount: 0,
          seoWarnCount: 0,
          searchConsoleConnected: false,
          openLeadCount: 0,
        }),
      ),
      "seo",
    );
    assert.ok(seo);
    assert.equal(seo.recommend.kind, "recommend");
    assert.equal(seo.recommend.classification, "optimization");
    assert.equal(seo.recommend.title, CONNECT_SEARCH_CONSOLE_STEP_TITLE);
    assert.match(seo.recommend.body, /will not edit the website/);
    assert.match(seo.recommend.body, /buy ads/);
  });

  it("asks to choose the Search Console property when Google is connected but none is saved", () => {
    const seo = specialistById(
      buildSpecialistReports(
        facts({
          seoScore: 88,
          seoSummary: "Looks complete.",
          seoCheckedAt: now,
          seoFailCount: 0,
          seoWarnCount: 0,
          searchConsoleConnected: true,
          searchConsoleProperty: false,
          openLeadCount: 0,
        }),
      ),
      "seo",
    );
    assert.ok(seo);
    assert.equal(seo.recommend.kind, "recommend");
    assert.equal(seo.recommend.classification, "optimization");
    assert.equal(seo.recommend.title, PICK_SEARCH_CONSOLE_STEP_TITLE);
    assert.match(seo.recommend.body, /Choose the Search Console property here/);
    assert.match(seo.recommend.body, /will not edit the website/);
  });

  it("asks to refresh Search Console when a property is saved but no numbers are stored", () => {
    const seo = specialistById(
      buildSpecialistReports(
        facts({
          seoScore: 88,
          seoSummary: "Looks complete.",
          seoCheckedAt: now,
          seoFailCount: 0,
          seoWarnCount: 0,
          searchConsoleConnected: true,
          searchConsoleProperty: true,
          searchConsoleSnapshot: false,
          openLeadCount: 0,
        }),
      ),
      "seo",
    );
    assert.ok(seo);
    assert.equal(seo.recommend.kind, "recommend");
    assert.equal(seo.recommend.classification, "optimization");
    assert.equal(seo.recommend.title, REFRESH_SEARCH_CONSOLE_STEP_TITLE);
    assert.match(seo.recommend.body, /Refresh here/);
    assert.match(seo.recommend.body, /will not edit the website/);
  });

  it("asks to refresh Search Console when stored numbers are more than a week old", () => {
    const seo = specialistById(
      buildSpecialistReports(
        facts({
          seoScore: 88,
          seoSummary: "Looks complete.",
          seoCheckedAt: now,
          seoFailCount: 0,
          seoWarnCount: 0,
          searchConsoleConnected: true,
          searchConsoleProperty: true,
          searchConsoleSnapshot: true,
          searchConsoleSnapshotAt: new Date("2026-08-15T12:00:00.000Z"),
          openLeadCount: 0,
        }),
      ),
      "seo",
    );
    assert.ok(seo);
    assert.equal(seo.recommend.kind, "recommend");
    assert.equal(seo.recommend.classification, "optimization");
    assert.equal(seo.recommend.title, REFRESH_SEARCH_CONSOLE_STEP_TITLE);
    assert.match(seo.recommend.body, /more than a week old/);
    assert.match(seo.recommend.body, /will not edit the website/);
  });

  it("asks to connect an existing website and never to move it", () => {
    const website = specialistById(
      buildSpecialistReports(facts({ websiteConnected: false, websiteUrl: "" })),
      "website",
    );
    assert.ok(website);
    assert.match(website.recommend.body, /Do not move the site/);
    assert.equal(website.recommend.href, "/app/website");
  });

  it("asks to paste the tracking snippet when a site is connected but no visits are recorded", () => {
    const website = specialistById(
      buildSpecialistReports(
        facts({
          websiteConnected: true,
          recordedVisitCount: 0,
          openLeadCount: 0,
          searchConsoleConnected: true,
        }),
      ),
      "website",
    );
    assert.ok(website);
    assert.equal(website.recommend.kind, "recommend");
    assert.equal(website.recommend.classification, "optimization");
    assert.equal(website.recommend.title, PASTE_SNIPPET_STEP_TITLE);
    assert.match(website.recommend.body, /does not replace that site/);
  });

  it("follows up open leads without sending email", () => {
    const crm = specialistById(
      buildSpecialistReports(facts({ openLeadCount: 3 })),
      "crm",
    );
    assert.ok(crm);
    assert.equal(crm.recommend.title, FOLLOW_UP_LEADS_STEP_TITLE);
    assert.match(crm.recommend.body, /Give each open lead a next step here/);
    assert.match(crm.recommend.body, /will not email them/);
    assert.equal(crm.recommend.href, "/app/crm");
  });

  it("asks to share the public lead form when no person has been captured yet", () => {
    const crm = specialistById(
      buildSpecialistReports(
        facts({
          openLeadCount: 0,
          contactCount: 0,
          websiteConnected: true,
        }),
      ),
      "crm",
    );
    assert.ok(crm);
    assert.equal(crm.recommend.kind, "recommend");
    assert.equal(crm.recommend.classification, "optimization");
    assert.equal(crm.recommend.title, SHARE_LEAD_FORM_STEP_TITLE);
    assert.match(crm.recommend.body, /Copy the public lead form here/);
    assert.match(crm.recommend.body, /add someone you already know/);
    assert.match(crm.recommend.body, /will not email anyone/);
  });

  it("asks to save brand voice when visits are recorded but no profile exists", () => {
    const website = specialistById(
      buildSpecialistReports(
        facts({
          recordedVisitCount: 1,
          brandVoiceSaved: false,
        }),
      ),
      "website",
    );
    assert.ok(website);
    assert.equal(website.recommend.kind, "recommend");
    assert.equal(website.recommend.classification, "strategic");
    assert.equal(website.recommend.title, SAVE_BRAND_VOICE_STEP_TITLE);
    assert.equal(website.recommend.href, "/app/brand-voice");
    assert.match(website.recommend.body, /will not send email/);
    assert.match(website.recommend.body, /edit the live website/);
  });

  it("asks to add a brand voice example after the profile is saved", () => {
    const website = specialistById(
      buildSpecialistReports(
        facts({
          recordedVisitCount: 1,
          brandVoiceSaved: true,
          brandVoiceExampleSaved: false,
        }),
      ),
      "website",
    );
    assert.ok(website);
    assert.equal(website.recommend.kind, "recommend");
    assert.equal(website.recommend.classification, "strategic");
    assert.equal(website.recommend.title, ADD_BRAND_VOICE_EXAMPLE_STEP_TITLE);
    assert.equal(website.recommend.href, "/app/brand-voice");
    assert.match(website.recommend.body, /Paste writing you already like here/);
    assert.match(website.recommend.body, /will not send email/);
  });

  it("keeps saving the brand voice profile ahead of adding an example", () => {
    const website = specialistById(
      buildSpecialistReports(
        facts({
          recordedVisitCount: 1,
          brandVoiceSaved: false,
          brandVoiceExampleSaved: false,
        }),
      ),
      "website",
    );
    assert.ok(website);
    assert.equal(website.recommend.title, SAVE_BRAND_VOICE_STEP_TITLE);
  });

  it("asks to draft copy after the voice profile and an example are saved", () => {
    const website = specialistById(
      buildSpecialistReports(
        facts({
          recordedVisitCount: 1,
          brandVoiceSaved: true,
          brandVoiceExampleSaved: true,
          brandVoiceDraftSaved: false,
        }),
      ),
      "website",
    );
    assert.ok(website);
    assert.equal(website.recommend.kind, "recommend");
    assert.equal(website.recommend.classification, "strategic");
    assert.equal(website.recommend.title, DRAFT_BRAND_VOICE_STEP_TITLE);
    assert.equal(website.recommend.href, "/app/brand-voice");
    assert.match(website.recommend.body, /Create a draft here/);
    assert.match(website.recommend.body, /will not send email/);
  });

  it("keeps adding a brand voice example ahead of drafting copy", () => {
    const website = specialistById(
      buildSpecialistReports(
        facts({
          recordedVisitCount: 1,
          brandVoiceSaved: true,
          brandVoiceExampleSaved: false,
          brandVoiceDraftSaved: false,
        }),
      ),
      "website",
    );
    assert.ok(website);
    assert.equal(website.recommend.title, ADD_BRAND_VOICE_EXAMPLE_STEP_TITLE);
  });

  it("keeps pasting the tracking snippet ahead of saving brand voice", () => {
    const website = specialistById(
      buildSpecialistReports(
        facts({
          recordedVisitCount: 0,
          brandVoiceSaved: false,
        }),
      ),
      "website",
    );
    assert.ok(website);
    assert.equal(website.recommend.title, PASTE_SNIPPET_STEP_TITLE);
  });

  it("asks to add an offer when visits are recorded and none are confirmed yet", () => {
    const website = specialistById(
      buildSpecialistReports(
        facts({
          recordedVisitCount: 1,
          confirmedOfferCount: 0,
          brandVoiceSaved: false,
        }),
      ),
      "website",
    );
    assert.ok(website);
    assert.equal(website.recommend.kind, "recommend");
    assert.equal(website.recommend.classification, "strategic");
    assert.equal(website.recommend.title, ADD_OFFER_STEP_TITLE);
    assert.equal(website.recommend.href, "/app/offers");
    assert.match(website.recommend.body, /will not start marketing/);
  });

  it("keeps pasting the tracking snippet ahead of adding an offer", () => {
    const website = specialistById(
      buildSpecialistReports(
        facts({
          recordedVisitCount: 0,
          confirmedOfferCount: 0,
        }),
      ),
      "website",
    );
    assert.ok(website);
    assert.equal(website.recommend.title, PASTE_SNIPPET_STEP_TITLE);
  });

  it("keeps adding an offer ahead of saving brand voice", () => {
    const website = specialistById(
      buildSpecialistReports(
        facts({
          recordedVisitCount: 1,
          confirmedOfferCount: 0,
          brandVoiceSaved: false,
        }),
      ),
      "website",
    );
    assert.ok(website);
    assert.equal(website.recommend.title, ADD_OFFER_STEP_TITLE);
  });

  it("asks to save the brand when visits are recorded but name, work, or audience is missing", () => {
    const website = specialistById(
      buildSpecialistReports(
        facts({
          recordedVisitCount: 1,
          brandSettingsSaved: false,
          confirmedOfferCount: 0,
        }),
      ),
      "website",
    );
    assert.ok(website);
    assert.equal(website.recommend.kind, "recommend");
    assert.equal(website.recommend.classification, "strategic");
    assert.equal(website.recommend.title, SAVE_BRAND_STEP_TITLE);
    assert.equal(website.recommend.href, "/app/settings/brand");
    assert.match(website.recommend.body, /will not start marketing/);
    assert.match(website.recommend.body, /edit the live website/);
  });

  it("keeps pasting the tracking snippet ahead of saving the brand", () => {
    const website = specialistById(
      buildSpecialistReports(
        facts({
          recordedVisitCount: 0,
          brandSettingsSaved: false,
        }),
      ),
      "website",
    );
    assert.ok(website);
    assert.equal(website.recommend.title, PASTE_SNIPPET_STEP_TITLE);
  });

  it("keeps saving the brand ahead of adding an offer", () => {
    const website = specialistById(
      buildSpecialistReports(
        facts({
          recordedVisitCount: 1,
          brandSettingsSaved: false,
          confirmedOfferCount: 0,
        }),
      ),
      "website",
    );
    assert.ok(website);
    assert.equal(website.recommend.title, SAVE_BRAND_STEP_TITLE);
  });

  it("asks to save how the business works after the brand is saved", () => {
    const website = specialistById(
      buildSpecialistReports(
        facts({
          recordedVisitCount: 1,
          businessBrainSaved: false,
          confirmedOfferCount: 0,
        }),
      ),
      "website",
    );
    assert.ok(website);
    assert.equal(website.recommend.kind, "recommend");
    assert.equal(website.recommend.classification, "strategic");
    assert.equal(website.recommend.title, SAVE_BUSINESS_STEP_TITLE);
    assert.equal(website.recommend.href, "/app/business");
    assert.match(website.recommend.body, /will not start marketing/);
    assert.match(website.recommend.body, /edit the live website/);
  });

  it("keeps saving the brand ahead of saving how the business works", () => {
    const website = specialistById(
      buildSpecialistReports(
        facts({
          recordedVisitCount: 1,
          brandSettingsSaved: false,
          businessBrainSaved: false,
        }),
      ),
      "website",
    );
    assert.ok(website);
    assert.equal(website.recommend.title, SAVE_BRAND_STEP_TITLE);
  });

  it("keeps saving how the business works ahead of adding an offer", () => {
    const website = specialistById(
      buildSpecialistReports(
        facts({
          recordedVisitCount: 1,
          businessBrainSaved: false,
          confirmedOfferCount: 0,
        }),
      ),
      "website",
    );
    assert.ok(website);
    assert.equal(website.recommend.title, SAVE_BUSINESS_STEP_TITLE);
  });

  it("asks to save today's Goal number when a connected Goal has no history yet", () => {
    const website = specialistById(
      buildSpecialistReports(
        facts({
          recordedVisitCount: 1,
          goalProgressNeedsSave: true,
          brandSettingsSaved: false,
        }),
      ),
      "website",
    );
    assert.ok(website);
    assert.equal(website.recommend.kind, "recommend");
    assert.equal(website.recommend.classification, "strategic");
    assert.equal(website.recommend.title, SAVE_PROGRESS_STEP_TITLE);
    assert.equal(website.recommend.href, "/app/goals");
    assert.match(website.recommend.body, /will not start marketing/);
  });

  it("keeps pasting the tracking snippet ahead of saving today's Goal number", () => {
    const website = specialistById(
      buildSpecialistReports(
        facts({
          recordedVisitCount: 0,
          goalProgressNeedsSave: true,
        }),
      ),
      "website",
    );
    assert.ok(website);
    assert.equal(website.recommend.title, PASTE_SNIPPET_STEP_TITLE);
  });

  it("keeps saving today's Goal number ahead of saving the brand", () => {
    const website = specialistById(
      buildSpecialistReports(
        facts({
          recordedVisitCount: 1,
          goalProgressNeedsSave: true,
          brandSettingsSaved: false,
        }),
      ),
      "website",
    );
    assert.ok(website);
    assert.equal(website.recommend.title, SAVE_PROGRESS_STEP_TITLE);
  });

  it("asks to connect payments so GroovGro can read a copy", () => {
    const crm = specialistById(
      buildSpecialistReports(
        facts({
          openLeadCount: 0,
          contactCount: 1,
          stripeConfigured: true,
          stripeConnected: false,
        }),
      ),
      "crm",
    );
    assert.ok(crm);
    assert.equal(crm.recommend.kind, "recommend");
    assert.equal(crm.recommend.classification, "optimization");
    assert.equal(crm.recommend.title, CONNECT_STRIPE_STEP_TITLE);
    assert.equal(crm.recommend.href, "/app/commerce");
    assert.match(crm.recommend.body, /Connect here/);
    assert.match(crm.recommend.body, /will not charge a card/);
    assert.match(crm.recommend.body, /change checkout/);
  });

  it("asks to sync payments after Stripe is marked connected", () => {
    const crm = specialistById(
      buildSpecialistReports(
        facts({
          openLeadCount: 0,
          contactCount: 1,
          stripeConfigured: true,
          stripeConnected: true,
          stripeSynced: false,
        }),
      ),
      "crm",
    );
    assert.ok(crm);
    assert.equal(crm.recommend.kind, "recommend");
    assert.equal(crm.recommend.classification, "optimization");
    assert.equal(crm.recommend.title, SYNC_STRIPE_STEP_TITLE);
    assert.match(crm.recommend.body, /Copy recent payment records here/);
    assert.match(crm.recommend.body, /will not charge a card/);
  });

  it("keeps sharing the lead form ahead of connecting payments", () => {
    const crm = specialistById(
      buildSpecialistReports(
        facts({
          openLeadCount: 0,
          contactCount: 0,
          websiteConnected: true,
          stripeConfigured: true,
          stripeConnected: false,
        }),
      ),
      "crm",
    );
    assert.ok(crm);
    assert.equal(crm.recommend.title, SHARE_LEAD_FORM_STEP_TITLE);
  });

  it("does not ask to connect payments when Stripe keys are missing", () => {
    const crm = specialistById(
      buildSpecialistReports(
        facts({
          openLeadCount: 0,
          contactCount: 1,
          stripeConfigured: false,
          stripeConnected: false,
        }),
      ),
      "crm",
    );
    assert.ok(crm);
    assert.equal(crm.recommend.kind, "no_change_yet");
  });

  it("asks to choose when you look at growth after the website basics are saved", () => {
    const website = specialistById(
      buildSpecialistReports(
        facts({
          recordedVisitCount: 1,
          growthScheduleSaved: false,
        }),
      ),
      "website",
    );
    assert.ok(website);
    assert.equal(website.recommend.kind, "recommend");
    assert.equal(website.recommend.classification, "strategic");
    assert.equal(website.recommend.title, SAVE_REVIEW_SCHEDULE_STEP_TITLE);
    assert.equal(website.recommend.href, "/app/goals");
    assert.match(website.recommend.body, /here/);
    assert.match(website.recommend.body, /will not change the business/);
  });

  it("keeps drafting copy ahead of choosing when you look at growth", () => {
    const website = specialistById(
      buildSpecialistReports(
        facts({
          recordedVisitCount: 1,
          brandVoiceDraftSaved: false,
          growthScheduleSaved: false,
        }),
      ),
      "website",
    );
    assert.ok(website);
    assert.equal(website.recommend.title, DRAFT_BRAND_VOICE_STEP_TITLE);
  });

  it("notices a far-behind availability Goal only after enough evidence", () => {
    const thin = specialistById(
      buildSpecialistReports(
        facts({
          goals: [utilizationGoal],
          upcomingEventCount: 2,
          evidenceSample: { elapsedDays: 2, observations: 3, conversions: 0 },
        }),
      ),
      "availability",
    );
    assert.equal(thin?.recommend.kind, "no_change_yet");

    const enough = specialistById(
      buildSpecialistReports(
        facts({
          goals: [utilizationGoal],
          upcomingEventCount: 2,
          evidenceSample: { elapsedDays: 30, observations: 40, conversions: 12 },
        }),
      ),
      "availability",
    );
    assert.equal(enough?.recommend.classification, "optimization");
    assert.match(enough?.recommend.body ?? "", /Review upcoming items here/);
    assert.match(enough?.recommend.body ?? "", /will not change ads or the website/);
  });

  it("never starts ads, email, or social", () => {
    const reports = buildSpecialistReports(
      facts({
        goals: [
          {
            id: "g-rev",
            title: "Match last month",
            status: "active",
            goalType: "revenue",
            liveCurrentValue: 100,
            targetValue: 400,
            progressPercent: 25,
            liveNote: "100 dollars.",
          },
        ],
      }),
    );
    for (const id of ["advertising", "email", "social"] as const) {
      const row = specialistById(reports, id);
      assert.ok(row);
      assert.equal(row.available, false);
      assert.equal(row.executeAllowed, false);
      assert.equal(row.recommend.kind, "no_change_yet");
      assert.match(row.recommend.body, /will not buy ads, send email, or publish social posts/);
    }
  });

  it("picks the matching Goal type for a specialist", () => {
    const goal = relatedGoalFor([utilizationGoal, visibilityGoal], "seo");
    assert.equal(goal?.id, "g-vis");
  });

  it("does not bake sailing or seat language into specialist copy", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/growth/specialists.ts"), "utf8");
    for (const banned of ["seat", "boat", "student", "ticket", "sailing", "bunk"]) {
      assert.equal(source.toLowerCase().includes(banned), false, banned);
    }
  });

  it("always stays on read, analyze, and recommend", () => {
    const reports = buildSpecialistReports(facts());
    assert.equal(reports.length, 7);
    assert.equal(
      reports.every((row) => row.mode === "read_analyze_recommend" && row.executeAllowed === false),
      true,
    );
  });
});
