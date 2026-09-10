import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

import { brainSeoContextCounts, brainSeoContextSaved } from "./brain-context";

describe("Business Brain SEO context", () => {
  it("treats any owner-entered extra as saved context", () => {
    assert.equal(brainSeoContextSaved(null), false);
    assert.equal(brainSeoContextSaved({}), false);
    assert.equal(brainSeoContextSaved({ competitors: ["  "] }), false);
    assert.equal(
      brainSeoContextSaved({ prohibitedClaims: ["Do not promise guaranteed results"] }),
      true,
    );
    assert.deepEqual(
      brainSeoContextCounts({
        idealCustomers: ["First-time buyers"],
        painPoints: ["Unclear next step", ""],
        competitors: [],
      }),
      {
        idealCustomers: 1,
        painPoints: 1,
        competitors: 0,
        differentiators: 0,
        prohibitedClaims: 0,
      },
    );
  });

  it("does not look up or scrape competitor websites", () => {
    const form = readFileSync(
      join(process.cwd(), "src/components/business-brain-form.tsx"),
      "utf8",
    );
    const action = readFileSync(join(process.cwd(), "src/lib/actions/growth.ts"), "utf8");
    const helper = readFileSync(join(process.cwd(), "src/lib/growth/brain-context.ts"), "utf8");
    assert.match(form, /name="idealCustomers"/);
    assert.match(form, /name="painPoints"/);
    assert.match(form, /name="competitors"/);
    assert.match(form, /name="differentiators"/);
    assert.match(form, /name="prohibitedClaims"/);
    assert.match(form, /will not look these businesses up/);
    assert.doesNotMatch(helper, /fetch\(/);
    assert.doesNotMatch(action, /fetch\(.*competitor/i);
    assert.match(action, /organizationId: session.organizationId/);
    assert.match(action, /idealCustomers/);
    assert.match(action, /prohibitedClaims/);
  });
});
