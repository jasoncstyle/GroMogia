import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { draftInspiredCopy } from "./inspired-copy";
import { draftInspiredRows } from "./inspiration";
import {
  completeOwnedCopyFacts,
  draftAboutPageRows,
  draftWorkPageRows,
  ownedExtraPages,
} from "./owned-site";

describe("owned GroovGro website draft", () => {
  it("fills topic and question gaps from the owner’s facts", () => {
    const facts = completeOwnedCopyFacts({
      businessName: "Harbor Workshops",
      description: "Hands-on classes for beginners.",
      targetCustomers: "people who want practical skills",
      businessType: "workshops",
      locations: [],
      serviceAreas: [],
      notes: "",
      inferredSummary: "",
      offers: [{ name: "Weekend Workshop", description: "A two-day starter session." }],
      topics: [],
      questions: [],
    });
    assert.equal(facts.topics.includes("Weekend Workshop"), true);
    assert.equal(facts.topics.length >= 3, true);
    assert.equal(facts.questions.includes("How do I get started?"), true);
  });

  it("drafts Home, About, and Work without pasted websites", () => {
    const rows = draftInspiredRows({
      businessName: "Harbor Workshops",
      description: "Hands-on classes for beginners.",
      targetCustomers: "people who want practical skills",
      businessType: "workshops",
      offers: [{ name: "Weekend Workshop", description: "A two-day starter session." }],
      layoutPages: [],
      copyPages: [],
    });
    const json = JSON.stringify(rows);
    assert.match(json, /Harbor Workshops/);
    assert.match(json, /Hands-on classes for beginners/);
    assert.match(json, /Weekend Workshop/);
    assert.equal(rows.some((row) => row.widgets.some((widget) => widget.type === "hero")), true);
    assert.equal(rows.some((row) => row.widgets.some((widget) => widget.type === "lead")), true);

    const copy = draftInspiredCopy({
      businessName: "Harbor Workshops",
      description: "Hands-on classes for beginners.",
      targetCustomers: "people who want practical skills",
      businessType: "workshops",
      locations: [],
      serviceAreas: [],
      notes: "",
      inferredSummary: "",
      offers: [{ name: "Weekend Workshop", description: "A two-day starter session." }],
      topics: ["Weekend Workshop", "What we do", "How it works"],
      questions: ["How do I get started?"],
    });
    const about = JSON.stringify(draftAboutPageRows(copy));
    const work = JSON.stringify(draftWorkPageRows(copy));
    assert.match(about, /About Harbor Workshops/);
    assert.match(work, /Weekend Workshop/);
    assert.deepEqual(
      ownedExtraPages(copy).map((page) => page.slug),
      ["about", "work"],
    );
  });

  it("does not bake industry-specific words into owned-site helpers", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/website-builder/owned-site.ts"),
      "utf8",
    );
    for (const banned of ["seat", "boat", "student", "ticket", "sailing", "bunk", "electrician"]) {
      assert.equal(source.toLowerCase().includes(banned), false, banned);
    }
  });
});
