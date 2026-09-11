import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

import {
  attributionLabelTitle,
  countAttributionLabels,
  isNamedAttributionOrigin,
  labelAttributionOrigin,
  labelStoredJoin,
  recordNamedOrigin,
} from "./attribution-labels";

describe("stored attribution join labels", () => {
  it("labels a stored named share as DIRECT", () => {
    const labeled = labelStoredJoin({
      kind: "lead",
      source: "instagram",
      campaign: "spring-open-house",
      contactId: "contact-1",
      namedOriginCount: 1,
    });
    assert.equal(labeled.label, "direct");
    assert.equal(attributionLabelTitle(labeled.label), "DIRECT");
    assert.match(labeled.why, /stored this named share/);
    assert.match(labeled.why, /not a keyword, AI-referral, or ad-click path/);
    assert.equal(isNamedAttributionOrigin("instagram", "spring-open-house"), true);
    assert.equal(isNamedAttributionOrigin("website_campaign", "spring-open-house"), true);
  });

  it("labels a person with two stored sources as ASSISTED", () => {
    const labeled = labelStoredJoin({
      kind: "charge",
      source: "instagram",
      campaign: "spring-open-house",
      contactId: "contact-1",
      namedOriginCount: 2,
    });
    assert.equal(labeled.label, "assisted");
    assert.match(labeled.why, /another stored source/);
    assert.match(labeled.why, /did not pick a single winner/);
  });

  it("labels an inferred Stripe or website source as ESTIMATED", () => {
    const stripe = labelAttributionOrigin({ source: "stripe" });
    assert.equal(stripe.label, "estimated");
    assert.match(stripe.why, /inferred this source/);
    const website = labelStoredJoin({
      kind: "lead",
      source: "website",
      contactId: "contact-1",
      namedOriginCount: 1,
    });
    assert.equal(website.label, "estimated");
    assert.equal(isNamedAttributionOrigin("website", ""), false);
    assert.equal(isNamedAttributionOrigin("stripe", ""), false);
  });

  it("labels a charge with no person as UNKNOWN", () => {
    const labeled = labelStoredJoin({
      kind: "charge",
      source: "",
      contactId: null,
    });
    assert.equal(labeled.label, "unknown");
    assert.match(labeled.why, /Match it on Bookings/);
    assert.match(labeled.why, /did not invent a keyword, AI referral, or ad click/);
    assert.equal(labelAttributionOrigin({ source: "" }).label, "unknown");
  });

  it("counts named origins per person and rolls up labels", () => {
    const origins = new Map<string, Set<string>>();
    recordNamedOrigin(origins, "contact-1", "instagram", "spring");
    recordNamedOrigin(origins, "contact-1", "facebook", "spring");
    recordNamedOrigin(origins, "contact-1", "website", "");
    assert.equal(origins.get("contact-1")?.size, 2);
    assert.deepEqual(countAttributionLabels(["direct", "assisted", "unknown", "direct"]), {
      direct: 2,
      assisted: 1,
      estimated: 0,
      unknown: 1,
    });
  });

  it("does not invent a keyword path, AI referral, ads, or a Next step", () => {
    const helper = readFileSync(
      join(process.cwd(), "src/lib/attribution-labels.ts"),
      "utf8",
    );
    const queries = readFileSync(
      join(process.cwd(), "src/lib/phase3/queries.ts"),
      "utf8",
    );
    const marketing = readFileSync(
      join(process.cwd(), "src/app/(app)/app/marketing/page.tsx"),
      "utf8",
    );
    const nextStep = readFileSync(
      join(process.cwd(), "src/lib/growth/next-step.ts"),
      "utf8",
    );
    for (const source of [helper, queries, marketing]) {
      assert.doesNotMatch(source, /fetch\(/);
      assert.doesNotMatch(source, /cheerio|puppeteer|playwright|openai|anthropic/i);
      assert.doesNotMatch(source, /google ads|gclid|fbclid/i);
    }
    assert.match(helper, /not invent a keyword, AI referral, or ad click/);
    assert.match(queries, /labelStoredJoin|labelAttributionOrigin/);
    assert.match(queries, /eq\(leadRecords\.organizationId, organizationId\)/);
    assert.match(marketing, /How sure/);
    assert.match(marketing, /Bookings/);
    assert.match(marketing, /will not buy ads/);
    assert.doesNotMatch(nextStep, /attributionLabel|attribution_label|How sure/);
    assert.match(
      nextStep,
      /drafts \?\? ownerWork \?\? checkChanged \?\? reviewSite \?\? activate \?\? draftPlan \?\? approvePlan \?\? proposeActions \?\? waitingApprove \?\? learning/,
    );
  });
});
