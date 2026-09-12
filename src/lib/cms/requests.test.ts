import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

import { requestCmsPublish } from "./adapter";
import { CMS_EVIDENCE_OWNER } from "./architecture";
import { cmsPublishEnabled, configuredCmsProvider } from "./provider";
import {
  CMS_PUBLISH_SOURCE_OWNER,
  CMS_PUBLISH_STATUS_REVIEW,
  describeCmsPublishRequest,
  planCmsPublishRequest,
  publishRequestsToShow,
} from "./requests";

const ORG_A = "11111111-1111-1111-1111-111111111111";
const DRAFT_A = "33333333-3333-3333-3333-333333333333";

describe("CMS publish review queue and disabled adapter", () => {
  it("plans a review request from a workspace draft", () => {
    const draft = planCmsPublishRequest({
      organizationId: ORG_A,
      draftId: DRAFT_A,
      title: "  Weekend beginner class  ",
      note: "  I already publish this by hand.  ",
    });
    assert.equal(draft.organizationId, ORG_A);
    assert.equal(draft.draftId, DRAFT_A);
    assert.equal(draft.title, "Weekend beginner class");
    assert.equal(draft.note, "I already publish this by hand.");
    assert.equal(draft.status, CMS_PUBLISH_STATUS_REVIEW);
    assert.equal(draft.source, CMS_PUBLISH_SOURCE_OWNER);
    assert.equal(draft.source, CMS_EVIDENCE_OWNER);
    assert.equal(
      describeCmsPublishRequest({
        title: "Weekend beginner class",
        note: "I already publish this by hand.",
      }),
      "Review later: “Weekend beginner class”. I already publish this by hand.",
    );
    assert.equal(
      publishRequestsToShow(
        new Array(15).fill(null).map((_, index) => ({
          id: String(index),
          draftId: DRAFT_A,
          title: "Weekend beginner class",
          note: "",
          createdAt: new Date(0),
        })),
      ).length,
      12,
    );
  });

  it("requires an organization and a workspace draft", () => {
    assert.throws(
      () =>
        planCmsPublishRequest({
          organizationId: "",
          draftId: DRAFT_A,
          title: "Weekend beginner class",
        }),
      /Missing organization/,
    );
    assert.throws(
      () =>
        planCmsPublishRequest({
          organizationId: ORG_A,
          draftId: "",
          title: "Weekend beginner class",
        }),
      /Pick a workspace draft/,
    );
  });

  it("keeps the adapter off and never publishes", () => {
    assert.equal(configuredCmsProvider(), "none");
    assert.equal(cmsPublishEnabled(), false);
    const refused = requestCmsPublish({
      organizationId: ORG_A,
      draftId: DRAFT_A,
      title: "Weekend beginner class",
    });
    assert.equal(refused.status, "off");
    assert.match(refused.reason, /will not publish/);
    assert.equal(
      requestCmsPublish({ organizationId: "", draftId: DRAFT_A, title: "x" })
        .status,
      "off",
    );
  });

  it("does not fetch, write a CMS, or create a Next step", () => {
    const helper = readFileSync(join(process.cwd(), "src/lib/cms/requests.ts"), "utf8");
    const adapter = readFileSync(join(process.cwd(), "src/lib/cms/adapter.ts"), "utf8");
    const provider = readFileSync(join(process.cwd(), "src/lib/cms/provider.ts"), "utf8");
    const action = readFileSync(
      join(process.cwd(), "src/lib/actions/cms-publish.ts"),
      "utf8",
    );
    const panel = readFileSync(
      join(process.cwd(), "src/components/cms-publish-panel.tsx"),
      "utf8",
    );
    const queries = readFileSync(
      join(process.cwd(), "src/lib/phase6/queries.ts"),
      "utf8",
    );
    for (const source of [helper, adapter, provider, action, panel, queries]) {
      assert.doesNotMatch(source, /fetch\(/);
      assert.doesNotMatch(source, /cheerio|puppeteer|playwright|openai|anthropic/i);
      assert.doesNotMatch(source, /wordpress|shopify|wp-json|wp\/v2/i);
    }
    assert.doesNotMatch(action, /requestCmsPublish|cmsPublishEnabled\(\)/);
    assert.match(action, /session\.organizationId/);
    assert.match(action, /eq\(contentDrafts\.organizationId, session\.organizationId\)/);
    assert.match(action, /did not publish/);
    assert.match(panel, /will not publish/);
    assert.match(panel, /adapter stays off/);
    const briefsPanel = readFileSync(
      join(process.cwd(), "src/components/content-briefs-panel.tsx"),
      "utf8",
    );
    assert.match(briefsPanel, /Save for later review/);
    assert.match(briefsPanel, /createCmsPublishRequest/);
    assert.doesNotMatch(briefsPanel, /requestCmsPublish|cmsPublishEnabled\(\)/);
    assert.match(adapter, /never fetches/);
    assert.match(queries, /eq\(cmsPublishRequests\.organizationId, organizationId\)/);

    const nextStep = readFileSync(
      join(process.cwd(), "src/lib/growth/next-step.ts"),
      "utf8",
    );
    assert.doesNotMatch(
      nextStep,
      /cmsPublish|cms_publish|Save for later review/,
    );
    const seoPage = readFileSync(
      join(process.cwd(), "src/app/(app)/app/seo/page.tsx"),
      "utf8",
    );
    assert.match(seoPage, /CmsPublishPanel/);
    const catalog = readFileSync(
      join(process.cwd(), "src/lib/modules/catalog.ts"),
      "utf8",
    );
    assert.doesNotMatch(catalog, /cms_publish|ai_visibility/);
  });
});
