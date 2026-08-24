import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildStatusAlerts, websiteWasRead } from "./status-alerts";

const readyWorkspace = {
  signedIn: true,
  organizationReady: true,
  missingServices: [] as string[],
  websiteUrl: "",
  websiteRead: false,
  stripeConnected: false,
  paymentCount: 0,
  recordedVisitCount: 0,
};

describe("status alerts", () => {
  it("treats a review summary as website-read only when pages were actually read", () => {
    assert.equal(
      websiteWasRead(
        "It read 4 connected website pages and did not change them. Drafts stay inactive until you confirm them.",
      ),
      true,
    );
    assert.equal(
      websiteWasRead("A website is connected at https://www.example.com."),
      false,
    );
    assert.equal(websiteWasRead(""), false);
    assert.equal(websiteWasRead(null), false);
  });

  it("shows a green workspace alert when the signed-in organization can load", () => {
    const [alert] = buildStatusAlerts({
      ...readyWorkspace,
      topics: ["workspace"],
    });
    assert.equal(alert?.tone, "ok");
    assert.equal(alert?.title, "This workspace is working");
  });

  it("shows a green website alert only after pages were read", () => {
    const waiting = buildStatusAlerts({
      ...readyWorkspace,
      websiteUrl: "https://www.example.com",
      websiteRead: false,
      topics: ["website"],
    });
    assert.equal(waiting[0]?.tone, "wait");
    assert.match(waiting[0]?.body ?? "", /find pages/i);
    assert.match(waiting[0]?.body ?? "", /Open Next step/);
    assert.equal(waiting[0]?.href, "/app/next-step");

    const ready = buildStatusAlerts({
      ...readyWorkspace,
      websiteUrl: "https://www.example.com",
      websiteRead: true,
      topics: ["website"],
    });
    assert.equal(ready[0]?.tone, "ok");
    assert.equal(ready[0]?.title, "Website is connected");
    assert.match(ready[0]?.body ?? "", /was not changed/);
    assert.equal(ready[0]?.href, undefined);
    const alertUi = readFileSync(
      join(process.cwd(), "src/components/status-alert.tsx"),
      "utf8",
    );
    assert.match(alertUi, /Open Next step/);
  });

  it("does not claim tracking works until visits or clicks exist", () => {
    const none = buildStatusAlerts({
      ...readyWorkspace,
      topics: ["tracking"],
    });
    assert.equal(none.length, 0);

    const working = buildStatusAlerts({
      ...readyWorkspace,
      recordedVisitCount: 3,
      topics: ["tracking"],
    });
    assert.equal(working[0]?.tone, "ok");
    assert.equal(working[0]?.title, "Website tracking is working");
  });

  it("shows Stripe as working when payments are arriving", () => {
    const waiting = buildStatusAlerts({
      ...readyWorkspace,
      stripeConnected: true,
      paymentCount: 0,
      topics: ["stripe"],
    });
    assert.equal(waiting[0]?.tone, "wait");

    const ready = buildStatusAlerts({
      ...readyWorkspace,
      stripeConnected: true,
      paymentCount: 2,
      topics: ["stripe"],
    });
    assert.equal(ready[0]?.tone, "ok");
    assert.match(ready[0]?.body ?? "", /does not charge cards/);
  });

  it("does not bake sailing or seat language into status alerts", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/growth/status-alerts.ts"), "utf8");
    for (const banned of ["seat", "boat", "student", "ticket", "sailing", "bunk"]) {
      assert.equal(source.toLowerCase().includes(banned), false, banned);
    }
  });
});
