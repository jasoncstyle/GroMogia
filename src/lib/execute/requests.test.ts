import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

import { requestExecute } from "./adapter";
import { EXECUTION_EVIDENCE_OWNER } from "./architecture";
import {
  configuredExecutionProvider,
  executionEnabled,
} from "./provider";
import {
  EXECUTION_SOURCE_OWNER,
  EXECUTION_STATUS_REVIEW,
  actionsToQueue,
  actionsWaitingToQueue,
  describeExecutionCopy,
  describeExecutionEmpty,
  describeExecutionHeading,
  describeExecutionRequest,
  executionActionTitle,
  isAllowedExecutionAction,
  planExecutionRequest,
  type ExecutionAction,
} from "./requests";

const ORG_A = "11111111-1111-1111-1111-111111111111";
const ORG_B = "22222222-2222-2222-2222-222222222222";
const ACTION_A = "33333333-3333-3333-3333-333333333333";

function action(overrides: Partial<ExecutionAction> = {}): ExecutionAction {
  return {
    id: ACTION_A,
    organizationId: ORG_A,
    title: "  Follow up open people  ",
    description: "Call the people waiting.",
    module: "crm",
    actionType: "follow_up_leads",
    status: "approved",
    executedAt: null,
    ...overrides,
  };
}

describe("later-run queue and disabled execute adapter", () => {
  it("plans a later-run request from approved work", () => {
    const draft = planExecutionRequest({
      organizationId: ORG_A,
      action: action(),
      note: "  I already do this by hand.  ",
    });
    assert.equal(draft.organizationId, ORG_A);
    assert.equal(draft.actionId, ACTION_A);
    assert.equal(draft.title, "Follow up open people");
    assert.equal(draft.note, "I already do this by hand.");
    assert.equal(draft.status, EXECUTION_STATUS_REVIEW);
    assert.equal(draft.source, EXECUTION_SOURCE_OWNER);
    assert.equal(draft.source, EXECUTION_EVIDENCE_OWNER);
    assert.equal(
      describeExecutionRequest({
        title: "Follow up open people",
        note: "I already do this by hand.",
      }),
      "Saved for later: “Follow up open people”. I already do this by hand.",
    );
    assert.equal(
      executionActionTitle({ title: "", description: "Call the people waiting." }),
      "Call the people waiting.",
    );
    assert.equal(isAllowedExecutionAction(action()), true);
    assert.equal(actionsToQueue([action(), action({ status: "proposed" })]).length, 1);
  });

  it("requires an organization and approved work GroovGro already leaves alone", () => {
    assert.throws(
      () => planExecutionRequest({ organizationId: "", action: action() }),
      /Missing organization/,
    );
    assert.throws(
      () => planExecutionRequest({ organizationId: ORG_A, action: null }),
      /Pick approved work/,
    );
    assert.throws(
      () =>
        planExecutionRequest({
          organizationId: ORG_A,
          action: action({ organizationId: ORG_B }),
        }),
      /another workspace/,
    );
    assert.throws(
      () =>
        planExecutionRequest({
          organizationId: ORG_A,
          action: action({ status: "proposed" }),
        }),
      /will not run ads/,
    );
    assert.throws(
      () =>
        planExecutionRequest({
          organizationId: ORG_A,
          action: action({ module: "advertising", actionType: "start_ads" }),
        }),
      /will not run ads/,
    );
    assert.equal(
      isAllowedExecutionAction(action({ module: "email", actionType: "send_email" })),
      false,
    );
    assert.equal(
      isAllowedExecutionAction(action({ executedAt: new Date(0) })),
      false,
    );
  });

  it("keeps the adapter off and never runs work", () => {
    assert.equal(configuredExecutionProvider(), "none");
    assert.equal(executionEnabled(), false);
    const refused = requestExecute({
      organizationId: ORG_A,
      actionId: ACTION_A,
      title: "Follow up open people",
    });
    assert.equal(refused.status, "off");
    assert.match(refused.reason, /will not run/);
    assert.equal(
      requestExecute({ organizationId: "", actionId: ACTION_A, title: "x" })
        .status,
      "off",
    );
  });

  it("does not fetch, run work, buy ads, or reorder Next step", () => {
    const helper = readFileSync(
      join(process.cwd(), "src/lib/execute/requests.ts"),
      "utf8",
    );
    const adapter = readFileSync(
      join(process.cwd(), "src/lib/execute/adapter.ts"),
      "utf8",
    );
    const provider = readFileSync(
      join(process.cwd(), "src/lib/execute/provider.ts"),
      "utf8",
    );
    const actionFile = readFileSync(
      join(process.cwd(), "src/lib/actions/execution.ts"),
      "utf8",
    );
    const panel = readFileSync(
      join(process.cwd(), "src/components/execution-panel.tsx"),
      "utf8",
    );
    const queries = readFileSync(
      join(process.cwd(), "src/lib/execute/queries.ts"),
      "utf8",
    );
    for (const source of [helper, adapter, provider, actionFile, panel, queries]) {
      assert.doesNotMatch(source, /fetch\(/);
      assert.doesNotMatch(source, /cheerio|puppeteer|playwright|openai|anthropic/i);
      assert.doesNotMatch(source, /google ads|sendgrid|mailchimp|wordpress|shopify/i);
    }
    assert.doesNotMatch(actionFile, /executedAt:\s*now|growthActions\.executedAt\s*=/);
    assert.doesNotMatch(actionFile, /requestExecute|executionEnabled\(\)/);
    assert.match(actionFile, /session\.organizationId/);
    assert.match(
      actionFile,
      /eq\(growthActions\.organizationId, session\.organizationId\)/,
    );
    assert.match(actionFile, /did not run it/);
    assert.match(describeExecutionCopy(0), /will not run it/);
    assert.match(describeExecutionCopy(0), /adapter stays off/);
    assert.match(describeExecutionCopy(1), /listed first/);
    assert.match(panel, /describeExecutionCopy/);
    assert.match(panel, /describeExecutionEmpty/);
    assert.match(describeExecutionEmpty(0), /No approved work is waiting/);
    assert.match(describeExecutionEmpty(2), /listed first/);
    assert.match(panel, /describeExecutionHeading/);
    assert.match(panel, /actionsWaitingToQueue/);
    assert.match(panel, /openActions.length/);
    assert.match(panel, /All approved work is already saved for later/);
    assert.equal(describeExecutionHeading(0), "What is waiting to run later");
    assert.equal(
      describeExecutionHeading(2, 1),
      "What is waiting to run later · 2 waiting · 1 still needs a later-run save",
    );
    assert.deepEqual(
      actionsWaitingToQueue(
        [{ id: "open" }, { id: "queued" }],
        [{ actionId: "queued" }],
      ).map((action) => action.id),
      ["open"],
    );
    assert.match(adapter, /never fetches/);
    assert.match(queries, /eq\(executionRequests\.organizationId, organizationId\)/);

    const nextStep = readFileSync(
      join(process.cwd(), "src/lib/growth/next-step.ts"),
      "utf8",
    );
    assert.doesNotMatch(
      nextStep,
      /executionRequest|execution_request|What is waiting to run later/,
    );
    assert.match(
      nextStep,
      /drafts \?\? ownerWork \?\? checkChanged \?\? reviewSite \?\? activate \?\? draftPlan \?\? approvePlan \?\? proposeActions \?\? waitingApprove \?\? searchLoop \?\? learning/,
    );
    const nextStepPage = readFileSync(
      join(process.cwd(), "src/app/(app)/app/next-step/page.tsx"),
      "utf8",
    );
    const workPage = readFileSync(
      join(process.cwd(), "src/app/(app)/app/work/page.tsx"),
      "utf8",
    );
    const intelligence = readFileSync(
      join(process.cwd(), "src/app/(app)/app/intelligence/page.tsx"),
      "utf8",
    );
    const bootstrap = readFileSync(
      join(process.cwd(), "src/lib/db/bootstrap.ts"),
      "utf8",
    );
    assert.match(nextStepPage, /ExecutionPanel/);
    assert.match(workPage, /ExecutionPanel/);
    assert.match(workPage, /Remaining later-run work is listed first/);
    assert.match(intelligence, /ExecutionPanel/);
    assert.match(intelligence, /Remaining later-run work is listed first/);
    assert.match(bootstrap, /growth_director/);
    assert.match(
      bootstrap,
      /flag\.key !== "growth_director" && flag\.key !== "guarded_automation"/,
    );
    const catalog = readFileSync(
      join(process.cwd(), "src/lib/modules/catalog.ts"),
      "utf8",
    );
    assert.doesNotMatch(catalog, /execution_request|growth_director/);
  });
});
