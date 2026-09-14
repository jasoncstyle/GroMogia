import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

import { SCHEDULED_TASKS } from "./catalog";
import {
  describeFrequency,
  isDue,
  nextRunAfterSuccess,
  nextRunAt,
} from "./schedule";

describe("refresh scheduler", () => {
  it("keeps manual only off the timer and names daily and weekly", () => {
    const now = new Date("2026-09-14T10:00:00.000Z");
    assert.equal(nextRunAt("off", now), null);
    assert.equal(isDue("off", now, now), false);
    const daily = nextRunAt("daily", now);
    assert.equal(daily?.toISOString(), "2026-09-14T12:15:00.000Z");
    assert.equal(isDue("daily", daily, now), false);
    assert.equal(isDue("daily", daily, new Date("2026-09-14T12:16:00.000Z")), true);
    const afterDaily = nextRunAfterSuccess("daily", new Date("2026-09-14T12:20:00.000Z"));
    assert.equal(afterDaily?.toISOString(), "2026-09-15T12:15:00.000Z");
    const afterWeekly = nextRunAfterSuccess("weekly", new Date("2026-09-14T12:20:00.000Z"));
    assert.equal(afterWeekly?.toISOString(), "2026-09-21T12:15:00.000Z");
    assert.equal(describeFrequency("off"), "Manual only");
    assert.equal(describeFrequency("daily"), "Every day");
  });

  it("registers read-only refreshes and keeps the owner buttons", () => {
    const keys = SCHEDULED_TASKS.map((task) => task.key);
    assert.deepEqual(keys, [
      "search_console.refresh",
      "ga4.refresh",
      "website.read",
      "stripe.sync",
    ]);
    const catalog = readFileSync(join(process.cwd(), "src/lib/jobs/catalog.ts"), "utf8");
    const run = readFileSync(join(process.cwd(), "src/lib/jobs/run.ts"), "utf8");
    const cron = readFileSync(join(process.cwd(), "src/app/api/cron/jobs/route.ts"), "utf8");
    const vercel = readFileSync(join(process.cwd(), "vercel.json"), "utf8");
    const panel = readFileSync(
      join(process.cwd(), "src/components/search-console-panel.tsx"),
      "utf8",
    );
    const ga4 = readFileSync(join(process.cwd(), "src/components/ga4-panel.tsx"), "utf8");
    const settings = readFileSync(
      join(process.cwd(), "src/app/(app)/app/settings/schedules/page.tsx"),
      "utf8",
    );
    assert.match(catalog, /search_console.refresh/);
    assert.doesNotMatch(catalog, /keyword planner|openserp|adwords/i);
    assert.doesNotMatch(keys.join(" "), /ads|execute|publish/);
    assert.doesNotMatch(run, /requestCmsPublish|requestExecute|googleapis\.com\/auth\/adwords/i);
    assert.match(cron, /CRON_SECRET/);
    assert.match(cron, /runDueScheduledJobs/);
    assert.match(vercel, /\/api\/cron\/jobs/);
    assert.match(panel, /Refresh Search Console/);
    assert.match(panel, /search_console.refresh/);
    assert.match(ga4, /Refresh Analytics/);
    assert.match(ga4, /ga4.refresh/);
    assert.match(settings, /Refresh schedules/);
    assert.doesNotMatch(settings, /myrtle|ocean sailing|seamark/i);
  });
});
