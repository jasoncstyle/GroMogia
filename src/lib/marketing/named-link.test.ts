import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  formatLeadOrigin,
  namedLeadFormUrl,
  publicLeadAttribution,
  slugForCampaignPart,
} from "./named-link";

describe("named campaign lead form links", () => {
  it("turns a place and a name into utm query params", () => {
    assert.equal(slugForCampaignPart(" Spring Open House "), "spring-open-house");
    assert.equal(
      namedLeadFormUrl("https://www.groovgro.com/l/demo", "Instagram", "Spring Open House"),
      "https://www.groovgro.com/l/demo?utm_source=instagram&utm_campaign=spring-open-house",
    );
    assert.equal(
      namedLeadFormUrl("https://www.example.com/", "Instagram", "Spring Open House"),
      "https://www.example.com/?utm_source=instagram&utm_campaign=spring-open-house",
    );
  });

  it("leaves the public form unchanged when the source is empty", () => {
    assert.equal(
      namedLeadFormUrl("https://www.groovgro.com/l/demo", "  "),
      "https://www.groovgro.com/l/demo",
    );
  });

  it("can name only the share when the place is already known", () => {
    assert.equal(
      namedLeadFormUrl("https://www.groovgro.com/l/demo", "newsletter", ""),
      "https://www.groovgro.com/l/demo?utm_source=newsletter",
    );
    assert.equal(
      namedLeadFormUrl("https://www.groovgro.com/l/demo", "", "Spring Open House"),
      "https://www.groovgro.com/l/demo?utm_campaign=spring-open-house",
    );
  });

  it("stores the named place as the public-form lead source", () => {
    assert.deepEqual(
      publicLeadAttribution({
        utmSource: "Instagram",
        utmCampaign: "Spring Open House",
      }),
      {
        source: "instagram",
        campaignId: "spring-open-house",
        channel: "instagram",
      },
    );
    assert.deepEqual(publicLeadAttribution({ utmSource: "newsletter" }), {
      source: "newsletter",
      campaignId: null,
      channel: "newsletter",
    });
    assert.deepEqual(publicLeadAttribution({ campaign: "website-builder" }), {
      source: "website_campaign",
      campaignId: "website-builder",
      channel: "campaign",
    });
    assert.deepEqual(publicLeadAttribution({}), {
      source: "website",
      campaignId: null,
      channel: "website",
    });
  });

  it("shows the place and share name together for follow-up", () => {
    assert.equal(
      formatLeadOrigin("instagram", "spring-open-house"),
      "instagram · spring-open-house",
    );
    assert.equal(formatLeadOrigin("instagram", ""), "instagram");
    assert.equal(formatLeadOrigin("", ""), "");
  });

  it("keeps naming a campaign on Marketing and does not start ads", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/marketing/page.tsx"),
      "utf8",
    );
    assert.match(page, /NamedLeadFormLink/);
    assert.match(page, /Name a campaign on a website link/);
    assert.match(page, /idPrefix="website-utm"/);
    assert.match(page, /copyAriaLabel="Copy named website link"/);
    assert.match(page, /Share name/);
    assert.match(page, /row\.campaign/);
    assert.match(page, /will not buy ads/);
    assert.doesNotMatch(page, /google ads/i);
    assert.doesNotMatch(page, /Open Website builder/);

    const observe = readFileSync(
      join(process.cwd(), "src/lib/intelligence/observe.ts"),
      "utf8",
    );
    assert.match(observe, /Name the campaign on shared links/);
    assert.match(observe, /href: "\/app\/marketing"/);
    assert.match(observe, /will not buy ads/);
    assert.doesNotMatch(observe, /google ads/i);
    assert.match(observe, /website_campaign/);
    assert.match(observe, /formatLeadOrigin/);

    const action = readFileSync(
      join(process.cwd(), "src/lib/actions/public-lead.ts"),
      "utf8",
    );
    assert.match(action, /publicLeadAttribution/);
    assert.match(action, /revalidatePath\("\/app\/marketing"\)/);
    assert.doesNotMatch(action, /source: parsed\.data\.campaign \? "website_campaign"/);

    const crmAction = readFileSync(
      join(process.cwd(), "src/lib/actions/crm.ts"),
      "utf8",
    );
    assert.match(crmAction, /revalidatePath\("\/app\/marketing"\)/);

    const commerceAction = readFileSync(
      join(process.cwd(), "src/lib/actions/commerce.ts"),
      "utf8",
    );
    assert.match(commerceAction, /revalidatePath\("\/app\/marketing"\)/);

    const formPage = readFileSync(
      join(process.cwd(), "src/app/l/[orgSlug]/page.tsx"),
      "utf8",
    );
    assert.match(formPage, /utmSource=\{query\.utm_source/);
    assert.match(formPage, /utmCampaign=\{query\.utm_campaign/);
    assert.doesNotMatch(
      formPage,
      /campaign=\{query\.utm_campaign \|\| query\.utm_source/,
    );

    const form = readFileSync(
      join(process.cwd(), "src/components/public-lead-form.tsx"),
      "utf8",
    );
    assert.match(form, /name="utmSource"/);
    assert.match(form, /name="utmCampaign"/);

    const nextStep = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    assert.match(nextStep, /leadOriginSuffix/);
    assert.match(nextStep, /formatLeadOrigin/);
    assert.match(nextStep, /NamedShareHint/);
    assert.match(nextStep, /href="\/app\/marketing"/);
    assert.doesNotMatch(nextStep, /NamedLeadFormLink/);

    const crm = readFileSync(
      join(process.cwd(), "src/app/(app)/app/crm/page.tsx"),
      "utf8",
    );
    assert.match(crm, /Share name/);
    assert.match(crm, /lead\.campaignId/);
    assert.match(crm, /firstCampaignByContact/);
    assert.match(crm, /customer\.marketingSource/);
    assert.match(crm, /href="\/app\/marketing"/);

    const dashboard = readFileSync(
      join(process.cwd(), "src/app/(app)/app/page.tsx"),
      "utf8",
    );
    assert.match(dashboard, /formatLeadOrigin/);
    assert.match(dashboard, /Open Marketing to see the share name/);
    assert.doesNotMatch(dashboard, /· \{lead\.source\}/);

    const website = readFileSync(
      join(process.cwd(), "src/app/(app)/app/website/page.tsx"),
      "utf8",
    );
    assert.match(website, /href="\/app\/marketing"/);
    assert.match(website, /will not buy ads/);

    const analytics = readFileSync(
      join(process.cwd(), "src/app/(app)/app/analytics/page.tsx"),
      "utf8",
    );
    assert.match(analytics, /href="\/app\/marketing"/);
    assert.match(analytics, /share name/);
    assert.doesNotMatch(analytics, /expands later/);

    const track = readFileSync(
      join(process.cwd(), "src/app/api/track/route.ts"),
      "utf8",
    );
    assert.match(track, /firstShareVisit/);
    assert.match(track, /revalidatePath\("\/app\/marketing"\)/);
  });
});
