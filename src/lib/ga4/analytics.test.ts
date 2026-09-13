import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

import { explainGa4, matchGa4Property } from "./analytics";
import {
  ga4Window,
  googleAnalyticsAuthorizeUrl,
} from "@/modules/integrations/google-analytics";

describe("ga4 adapter", () => {
  it("requests only the Analytics read-only scope", () => {
    const url = googleAnalyticsAuthorizeUrl("state-token", {
      clientId: "client-id",
      clientSecret: "client-secret",
      redirectUri: "https://www.groovgro.com/api/google-analytics/callback",
    });
    assert.match(url, /analytics\.readonly/);
    assert.match(url, /google-analytics%2Fcallback|google-analytics\/callback/);
    assert.equal(/adwords|googleads|webmasters/i.test(url), false);
  });

  it("uses a 28-day window that ends yesterday", () => {
    const window = ga4Window(new Date("2026-09-13T15:00:00Z"));
    assert.equal(window.endDate, "2026-09-12");
    assert.equal(window.startDate, "2026-08-16");
  });

  it("picks a single property or a name that matches the website", () => {
    assert.equal(
      matchGa4Property("https://harbor.example", [
        { propertyId: "1", displayName: "Harbor", accountName: "School" },
      ]).matched?.propertyId,
      "1",
    );
    assert.equal(
      matchGa4Property("https://www.harbor.example", [
        { propertyId: "1", displayName: "Other", accountName: "A" },
        { propertyId: "2", displayName: "Harbor site", accountName: "harbor.example" },
      ]).matched?.propertyId,
      "2",
    );
    assert.equal(
      matchGa4Property("https://harbor.example", [
        { propertyId: "1", displayName: "One", accountName: "A" },
        { propertyId: "2", displayName: "Two", accountName: "B" },
      ]).matched,
      null,
    );
  });

  it("explains stored numbers without inventing ranks", () => {
    const copy = explainGa4({
      propertyId: "123",
      propertyName: "Harbor",
      startDate: "2026-08-16",
      endDate: "2026-09-12",
      totals: { sessions: 40, activeUsers: 22 },
      topPages: [{ key: "/", sessions: 20 }],
      topSources: [{ key: "google", sessions: 18 }],
    });
    assert.match(copy.headline, /40 sessions/);
    assert.match(copy.paragraphs.join(" "), /does not change the website/);
    assert.doesNotMatch(copy.paragraphs.join(" "), /keyword volume|rank tracker/i);
  });

  it("connects GA4 without ads or Search Console scopes", () => {
    const adapter = readFileSync(
      join(process.cwd(), "src/modules/integrations/google-analytics.ts"),
      "utf8",
    );
    const actions = readFileSync(join(process.cwd(), "src/lib/actions/ga4.ts"), "utf8");
    const start = readFileSync(
      join(process.cwd(), "src/app/api/google-analytics/start/route.ts"),
      "utf8",
    );
    const panel = readFileSync(join(process.cwd(), "src/components/ga4-panel.tsx"), "utf8");
    const schema = readFileSync(join(process.cwd(), "src/lib/db/ensure-schema.ts"), "utf8");
    assert.match(adapter, /analyticsadmin.googleapis.com/);
    assert.match(adapter, /analyticsdata.googleapis.com/);
    assert.doesNotMatch(adapter, /adwords|googleads|webmasters/i);
    assert.match(actions, /analytics.readonly/);
    assert.doesNotMatch(actions, /requestCmsPublish|requestExecute/i);
    assert.match(start, /googleAnalyticsAuthorizeUrl/);
    assert.match(panel, /Connect Google Analytics/);
    assert.match(schema, /0045_ga4_snapshots/);
  });
});
