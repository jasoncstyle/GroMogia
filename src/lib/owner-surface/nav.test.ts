import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { executionEnabled } from "@/lib/execute/provider";
import { requestExecute } from "@/lib/execute/adapter";

import {
  greetingFor,
  HIDDEN_ADVANCED_HREFS,
  isPrimaryNavActive,
  LEGACY_OWNER_REDIRECTS,
  PRIMARY_OWNER_NAV,
  SETTINGS_LINKS,
} from "./nav";
import {
  businessPulse,
  growBoards,
  parseBusinessSection,
  parseWorkTab,
  recentWin,
} from "./boards";

describe("owner surface nav", () => {
  it("uses the five approved primary items", () => {
    assert.deepEqual(
      PRIMARY_OWNER_NAV.map((item) => item.label),
      ["Home", "Grow", "Work", "Results", "Business"],
    );
    assert.deepEqual(
      PRIMARY_OWNER_NAV.map((item) => item.href),
      ["/app", "/app/grow", "/app/work", "/app/results", "/app/business"],
    );
  });

  it("treats grow/do as Grow, not Home", () => {
    assert.equal(isPrimaryNavActive("/app", "/app"), true);
    assert.equal(isPrimaryNavActive("/app/grow", "/app"), false);
    assert.equal(isPrimaryNavActive("/app/grow/do", "/app/grow"), true);
    assert.equal(isPrimaryNavActive("/app/business?section=goals", "/app/business"), true);
  });

  it("keeps connections and the earlier desk in Settings, not primary nav", () => {
    assert.ok(SETTINGS_LINKS.some((item) => item.href === "/app/settings/connections"));
    assert.ok(SETTINGS_LINKS.some((item) => item.href === "/app/settings/desk"));
    assert.ok(HIDDEN_ADVANCED_HREFS.includes("/app/bot-team"));
    assert.ok(HIDDEN_ADVANCED_HREFS.includes("/app/website-builder"));
  });

  it("redirects the approved legacy owner routes", () => {
    assert.deepEqual(
      LEGACY_OWNER_REDIRECTS.map((row) => row.source),
      ["/app/next-step", "/app/growth-review", "/app/intelligence", "/app/integrations"],
    );
  });

  it("writes a short greeting without inventing a business name", () => {
    assert.deepEqual(greetingFor("Jason Cole", "Harbor Fitness"), {
      hello: "Hi Jason.",
      context: "Here is Harbor Fitness. GroovGro is here to help this business grow.",
    });
    assert.equal(greetingFor("", "").hello, "Hi there.");
  });
});

describe("owner surface boards", () => {
  it("picks up to three pulse items from stored facts", () => {
    const items = businessPulse({
      openLeadCount: 2,
      customerCount: 4,
      stripeConnected: true,
      paymentCount: 3,
      paymentTotalLabel: "$120.00",
      goalTitle: "More booked sessions",
      goalProgressPercent: 40,
      goalLiveComputable: true,
      websiteConnected: true,
      websiteRead: true,
      searchClicks: 12,
    });
    assert.equal(items.length, 3);
    assert.equal(items[0]?.id, "goal");
    assert.equal(items[0]?.evidence, "measured");
    assert.equal(items[1]?.id, "leads");
    assert.equal(items[2]?.id, "payments");
  });

  it("does not invent a payment pulse when Stripe has no stored payments", () => {
    const items = businessPulse({
      stripeConnected: true,
      paymentCount: 0,
      websiteConnected: true,
      websiteRead: false,
    });
    assert.equal(items.some((item) => item.id === "payments"), false);
    assert.equal(items[0]?.id, "website");
    assert.equal(items[0]?.evidence, "unknown");
  });

  it("keeps Best Next Move from also-worth and watching", () => {
    const boards = growBoards({
      primary: {
        title: "Confirm or reject what GroovGro drafted",
        body: "Two suggested offers still need you.",
        href: "/app/next-step",
      },
      waitingActions: [
        { id: "1", title: "Confirm or reject what GroovGro drafted", description: "dup" },
        { id: "2", title: "Approve the plan", description: "plan" },
      ],
      searchWatching: [{ query: "harbor fitness class", why: "Stored search. Not enough yet." }],
    });
    assert.equal(boards.best?.title, "Confirm or reject what GroovGro drafted");
    assert.equal(boards.also.length, 1);
    assert.equal(boards.also[0]?.title, "Approve the plan");
    assert.equal(boards.watching[0]?.title, "harbor fitness class");
  });

  it("does not manufacture a recent win", () => {
    assert.equal(recentWin({}), null);
    assert.equal(recentWin({ finishedWorkCount: 0 }), null);
    assert.match(recentWin({ latestLearning: "Wait before changing course." })?.body ?? "", /Wait before/);
  });

  it("parses Work and Business sections", () => {
    assert.equal(parseWorkTab("working"), "working");
    assert.equal(parseWorkTab("mystery"), "needs-you");
    assert.equal(parseBusinessSection("goals"), "goals");
    assert.equal(parseBusinessSection("facts"), "about");
  });
});

describe("owner surface fences", () => {
  it("keeps A3/A4 and execute off", () => {
    assert.equal(executionEnabled(), false);
    assert.equal(
      requestExecute({
        organizationId: "11111111-1111-1111-1111-111111111111",
        actionId: "22222222-2222-2222-2222-222222222222",
        title: "Paste the draft",
      }).status,
      "off",
    );
  });

  it("hides bot names and module nav from the primary shell", () => {
    const shell = readFileSync(join(process.cwd(), "src/components/app-shell.tsx"), "utf8");
    const home = readFileSync(join(process.cwd(), "src/app/(app)/app/page.tsx"), "utf8");
    const grow = readFileSync(join(process.cwd(), "src/app/(app)/app/grow/page.tsx"), "utf8");
    const work = readFileSync(join(process.cwd(), "src/app/(app)/app/work/page.tsx"), "utf8");
    const results = readFileSync(join(process.cwd(), "src/app/(app)/app/results/page.tsx"), "utf8");
    const config = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");
    for (const banned of ["SEOgro", "DRAFTgro", "WRITEgro", "Bot team", "Search desk", "pack schema", "workflow node"]) {
      assert.equal(shell.includes(banned), false, banned);
      assert.equal(home.includes(banned), false, `home ${banned}`);
      assert.equal(grow.includes(banned), false, `grow ${banned}`);
      assert.equal(results.includes(banned), false, `results ${banned}`);
    }
    assert.match(shell, /PRIMARY_OWNER_NAV/);
    assert.match(shell, /item\.label/);
    assert.doesNotMatch(shell, /label="Dashboard"/);
    assert.doesNotMatch(shell, /useEffect/);
    assert.match(home, /Best Next Move/);
    assert.match(grow, /Also worth doing/);
    assert.match(work, /Needs you/);
    assert.match(results, /Is GroovGro helping/);
    assert.match(config, /destination: "\/app\/grow"/);
    assert.match(config, /destination: "\/app\/results"/);
    assert.match(config, /destination: "\/app\/settings\/connections"/);
  });

  it("does not add Stage 2 tables or migrations", () => {
    const schema = readFileSync(join(process.cwd(), "src/lib/db/schema.ts"), "utf8");
    assert.doesNotMatch(schema, /owner_decision_queue|mvbb_|fact_records|observation_records|permission_grants|job_packages/);
  });
});
