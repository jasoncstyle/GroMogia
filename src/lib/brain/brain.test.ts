import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

import { executionEnabled } from "@/lib/execute/provider";
import { requestExecute } from "@/lib/execute/adapter";

import { sourceAuthoritativeForDomain, canPromoteToVerified } from "./authority";
import {
  FUTURE_BRAIN_MIGRATION_STEPS,
  readOwnerFacingBrain,
  snapshotLegacyBrain,
  snapshotPromotedAnyVerified,
  type LegacyBusinessBrain,
} from "./compatibility";
import { evaluateFactUse, evaluateObservationAsFact } from "./gate";
import { MemoryBrainStore } from "./store";
import {
  FACT_RISKS,
  FACT_STATUSES,
  FRESHNESS_STATES,
  SOURCE_CLASSES,
  SOURCE_CLASS_NAMES,
} from "./types";

const NORTHWIND = "11111111-1111-1111-1111-111111111111";
const CEDAR = "22222222-2222-2222-2222-222222222222";

function northwindBrain(): LegacyBusinessBrain {
  return {
    organizationId: NORTHWIND,
    industry: "workshops",
    businessModel: "in-person classes",
    locations: ["Harbor District studio"],
    serviceAreas: ["Northwater"],
    operatingHours: "Tue–Sat 10–6",
    seasonality: "quieter in January",
    notes: "Do not promise same-day booking.",
    idealCustomers: ["first-time makers"],
    painPoints: ["unclear next step"],
    competitors: ["Cedar Goods"],
    differentiators: ["small class size"],
    prohibitedClaims: ["guaranteed results"],
    discoveryStatus: "confirmed",
    inferredSummary: "Likely a workshop studio.",
    inferredSource: "legacy worker note",
    confidence: 92,
  };
}

describe("Fact statuses and risk", () => {
  it("supports the seven fact statuses and three risk levels", () => {
    assert.deepEqual([...FACT_STATUSES], [
      "VERIFIED",
      "PROVISIONAL",
      "NEEDS_OWNER_CONFIRMATION",
      "UNKNOWN",
      "NOT_CURRENT",
      "OWNER_STATED_FUTURE_INTENT",
      "SUPERSEDED",
    ]);
    assert.deepEqual([...FACT_RISKS], ["LOW", "MEDIUM", "HIGH"]);
    assert.deepEqual([...FRESHNESS_STATES], [
      "CURRENT_ENOUGH",
      "AGING",
      "STALE_REVERIFY",
    ]);
  });

  it("does not use a generic confidence percentage as trust (AT-FACT-01)", () => {
    const schema = readFileSync(join(process.cwd(), "src/lib/db/schema.ts"), "utf8");
    const slice = schema.slice(schema.indexOf("export const brainFacts"));
    const factTable = slice.slice(0, slice.indexOf("export const brainFactHistory"));
    assert.equal(factTable.includes("confidence"), false);
    assert.doesNotMatch(factTable, /percent/i);
    const types = readFileSync(join(process.cwd(), "src/lib/brain/types.ts"), "utf8");
    assert.doesNotMatch(types, /confidencePercent|confidence_pct/i);
  });
});

describe("Source classification and domain authority", () => {
  it("names S1–S6 without treating them as a universal ranking", () => {
    assert.deepEqual([...SOURCE_CLASSES], ["S1", "S2", "S3", "S4", "S5", "S6"]);
    assert.equal(SOURCE_CLASS_NAMES.S1, "Owner Decision / Confirmation");
    assert.equal(SOURCE_CLASS_NAMES.S6, "Worker Inference");
  });

  it("treats a catalog system as authoritative only for inventory", () => {
    const inventory = sourceAuthoritativeForDomain({
      sourceClass: "S2",
      sourceDomain: "inventory",
      factDomain: "inventory",
    });
    const strategy = sourceAuthoritativeForDomain({
      sourceClass: "S2",
      sourceDomain: "inventory",
      factDomain: "strategy",
    });
    assert.equal(inventory.authoritative, true);
    assert.equal(strategy.authoritative, false);
  });

  it("does not let the owner invent an external certification", () => {
    const cert = sourceAuthoritativeForDomain({
      sourceClass: "S1",
      sourceDomain: "strategy",
      factDomain: "external_certification",
    });
    assert.equal(cert.authoritative, false);
  });

  it("lets the owner confirm strategy", () => {
    const strategy = sourceAuthoritativeForDomain({
      sourceClass: "S1",
      sourceDomain: "strategy",
      factDomain: "strategy",
    });
    assert.equal(strategy.authoritative, true);
  });

  it("never treats worker inference as authoritative", () => {
    const inferred = sourceAuthoritativeForDomain({
      sourceClass: "S6",
      sourceDomain: "identity",
      factDomain: "identity",
    });
    assert.equal(inferred.authoritative, false);
  });
});

describe("Fact versus Observation", () => {
  it("records a public price claim without making it a VERIFIED fact (AT-FACT-02)", () => {
    const store = new MemoryBrainStore();
    const page = store.createSource(NORTHWIND, {
      sourceClass: "S3",
      name: "Workshop pricing page",
      domain: "pricing",
      kind: "business_controlled",
      locator: "https://northwind.example/pricing",
    });
    const observation = store.createObservation(NORTHWIND, {
      sourceId: page.id,
      subject: "weekend workshop",
      observedClaim: "The page displays $75.",
      locator: "/pricing",
      observedAt: new Date("2026-03-01T12:00:00Z"),
    });
    const asFact = evaluateObservationAsFact({
      observation,
      intendedUse: "quote_current_price",
    });
    assert.equal(asFact.allowed, false);
    assert.match(asFact.reasons.join(" "), /observation is not a fact/i);
    assert.match(asFact.reasons.join(" "), /VERIFIED price/i);
    assert.equal(store.listFacts(NORTHWIND).length, 0);
  });

  it("does not generalize a sold-out sample into a population VERIFIED claim (AT-FACT-03)", () => {
    const store = new MemoryBrainStore();
    const catalog = store.createSource(CEDAR, {
      sourceClass: "S3",
      name: "Cedar Goods product pages",
      domain: "inventory",
      kind: "business_controlled",
    });
    const observation = store.createObservation(CEDAR, {
      sourceId: catalog.id,
      subject: "product pages viewed",
      observedClaim: "Every product viewed was sold out.",
      observedAt: new Date("2026-04-01T12:00:00Z"),
      coverageNote: "8 of an unknown number of product pages were reviewed.",
    });
    const fact = store.createFact(CEDAR, {
      subject: "catalog",
      attribute: "sold_out",
      valueText: "All website products are sold out",
      status: "PROVISIONAL",
      risk: "MEDIUM",
      freshness: "CURRENT_ENOUGH",
      sourceId: catalog.id,
      domain: "inventory",
      coverageLimitation: observation.coverageNote,
    });
    const promotion = canPromoteToVerified({
      fact,
      source: store.getSource(CEDAR, catalog.id),
    });
    assert.equal(promotion.allowed, false);
    const use = evaluateFactUse({
      fact: { ...fact, status: "VERIFIED" },
      source: store.getSource(CEDAR, catalog.id),
      intendedUse: "customer_facing_claim",
    });
    assert.equal(use.allowed, false);
    assert.match(use.reasons.join(" "), /sample|coverage|population/i);
  });
});

describe("Fact-Use Gate", () => {
  it("allows internal investigation of a provisional fact", () => {
    const store = new MemoryBrainStore();
    const site = store.createSource(NORTHWIND, {
      sourceClass: "S3",
      name: "Studio homepage",
      domain: "website_content",
      kind: "business_controlled",
    });
    const fact = store.createFact(NORTHWIND, {
      subject: "studio",
      attribute: "has_public_hours",
      valueText: "Tue–Sat",
      status: "PROVISIONAL",
      risk: "LOW",
      freshness: "CURRENT_ENOUGH",
      sourceId: site.id,
      domain: "operations",
    });
    const decision = evaluateFactUse({
      fact,
      source: store.getSource(NORTHWIND, site.id),
      intendedUse: "internal_investigation",
    });
    assert.equal(decision.allowed, true);
    assert.equal(decision.grantsExternalAction, false);
  });

  it("withholds high-risk provisional facts from consequential use", () => {
    const store = new MemoryBrainStore();
    const site = store.createSource(NORTHWIND, {
      sourceClass: "S3",
      name: "Safety page",
      domain: "safety",
      kind: "business_controlled",
    });
    const fact = store.createFact(NORTHWIND, {
      subject: "workshop",
      attribute: "insurance_required",
      valueText: "Not required",
      status: "PROVISIONAL",
      risk: "HIGH",
      freshness: "CURRENT_ENOUGH",
      sourceId: site.id,
      domain: "safety",
    });
    const quote = evaluateFactUse({
      fact,
      source: store.getSource(NORTHWIND, site.id),
      intendedUse: "customer_facing_claim",
    });
    assert.equal(quote.allowed, false);
    assert.match(quote.reasons.join(" "), /HIGH-risk provisional|PROVISIONAL/i);
    assert.equal(
      canPromoteToVerified({
        fact,
        source: store.getSource(NORTHWIND, site.id),
      }).allowed,
      false,
    );
  });

  it("withholds stale facts from consequential use", () => {
    const store = new MemoryBrainStore();
    const shop = store.createSource(CEDAR, {
      sourceClass: "S2",
      name: "Cedar catalog",
      domain: "inventory",
      kind: "system_of_record",
    });
    const fact = store.createFact(CEDAR, {
      subject: "linen tote",
      attribute: "in_stock",
      valueText: "12",
      status: "PROVISIONAL",
      risk: "MEDIUM",
      freshness: "STALE_REVERIFY",
      sourceId: shop.id,
      domain: "inventory",
    });
    fact.status = "VERIFIED";
    const decision = evaluateFactUse({
      fact,
      source: store.getSource(CEDAR, shop.id),
      intendedUse: "promise_availability",
    });
    assert.equal(decision.allowed, false);
    assert.match(decision.reasons.join(" "), /stale/i);
  });

  it("does not grant publish, send, spend, or live-site change", () => {
    const store = new MemoryBrainStore();
    const owner = store.createSource(NORTHWIND, {
      sourceClass: "S1",
      name: "Owner confirmation",
      domain: "strategy",
      kind: "owner_confirmation",
    });
    const fact = store.createFact(NORTHWIND, {
      subject: "business",
      attribute: "positioning",
      valueText: "hands-on workshops",
      status: "PROVISIONAL",
      risk: "LOW",
      freshness: "CURRENT_ENOUGH",
      sourceId: owner.id,
      domain: "strategy",
    });
    store.promoteToVerified(NORTHWIND, fact.id, "Owner owns this domain.");
    for (const intendedUse of ["publish", "send", "spend", "change_external"] as const) {
      const decision = evaluateFactUse({
        fact: store.getFact(NORTHWIND, fact.id)!,
        source: store.getSource(NORTHWIND, owner.id),
        intendedUse,
      });
      assert.equal(decision.allowed, false, intendedUse);
      assert.equal(decision.grantsExternalAction, false);
    }
  });

  it("records material Fact-Use Gate decisions", () => {
    const store = new MemoryBrainStore();
    const fact = store.createFact(NORTHWIND, {
      subject: "business",
      attribute: "public_price",
      valueText: "unknown",
      status: "UNKNOWN",
      risk: "HIGH",
      freshness: "STALE_REVERIFY",
      domain: "pricing",
    });
    const decision = evaluateFactUse({
      fact,
      source: null,
      intendedUse: "quote_current_price",
    });
    store.recordGateDecision(NORTHWIND, fact.id, decision);
    assert.equal(
      store.audits.some((row) => row.action === "brain.fact_use_gate.material"),
      true,
    );
  });
});

describe("Contradictions and supersession", () => {
  it("keeps a conflict OPEN instead of picking first or newest (AT-FACT-04)", () => {
    const store = new MemoryBrainStore();
    const page = store.createSource(NORTHWIND, {
      sourceClass: "S3",
      name: "Pricing page",
      domain: "pricing",
      kind: "business_controlled",
    });
    const sheet = store.createSource(NORTHWIND, {
      sourceClass: "S2",
      name: "Booking catalog",
      domain: "pricing",
      kind: "system_of_record",
    });
    const fromPage = store.createFact(NORTHWIND, {
      subject: "weekend workshop",
      attribute: "price",
      valueText: "75",
      status: "PROVISIONAL",
      risk: "HIGH",
      freshness: "CURRENT_ENOUGH",
      sourceId: page.id,
      domain: "pricing",
      observedAt: new Date("2026-05-02T00:00:00Z"),
    });
    const fromCatalog = store.createFact(NORTHWIND, {
      subject: "weekend workshop",
      attribute: "price",
      valueText: "90",
      status: "PROVISIONAL",
      risk: "HIGH",
      freshness: "CURRENT_ENOUGH",
      sourceId: sheet.id,
      domain: "pricing",
      observedAt: new Date("2026-05-03T00:00:00Z"),
    });
    const contradiction = store.createContradiction(NORTHWIND, {
      summary: "Public page and catalog disagree on weekend price.",
      domain: "pricing",
      members: [
        { partyType: "fact", partyId: fromPage.id, role: "conflicting" },
        { partyType: "fact", partyId: fromCatalog.id, role: "conflicting" },
      ],
    });
    assert.equal(contradiction.status, "OPEN");
    assert.throws(() =>
      store.resolveContradiction(
        NORTHWIND,
        contradiction.id,
        fromPage.id,
        "Pick the first value",
      ),
    );
    store.narrowContradiction(
      NORTHWIND,
      contradiction.id,
      "Narrowed to current weekend public price vs catalog.",
    );
    assert.equal(store.contradictions.get(contradiction.id)?.status, "NARROWED");
    const gated = evaluateFactUse({
      fact: fromCatalog,
      source: store.getSource(NORTHWIND, sheet.id),
      intendedUse: "quote_current_price",
      contradictions: store.openContradictionsForFact(NORTHWIND, fromCatalog.id),
    });
    assert.equal(gated.allowed, false);
  });

  it("preserves previous values when a fact is superseded", () => {
    const store = new MemoryBrainStore();
    const owner = store.createSource(NORTHWIND, {
      sourceClass: "S1",
      name: "Owner confirmation",
      domain: "strategy",
      kind: "owner_confirmation",
    });
    const previous = store.createFact(NORTHWIND, {
      subject: "business",
      attribute: "primary_offer",
      valueText: "Drop-in studio time",
      status: "PROVISIONAL",
      risk: "LOW",
      freshness: "CURRENT_ENOUGH",
      sourceId: owner.id,
      domain: "strategy",
    });
    const { previous: oldRow, replacement } = store.supersedeFact(
      NORTHWIND,
      previous.id,
      {
        subject: "business",
        attribute: "primary_offer",
        valueText: "Scheduled weekend workshop",
        status: "PROVISIONAL",
        risk: "LOW",
        freshness: "CURRENT_ENOUGH",
        sourceId: owner.id,
        domain: "strategy",
      },
      "Owner replaced the primary offer.",
    );
    assert.equal(oldRow.status, "SUPERSEDED");
    assert.equal(oldRow.supersededByFactId, replacement.id);
    assert.equal(replacement.supersedesFactId, oldRow.id);
    assert.equal(oldRow.valueText, "Drop-in studio time");
    const history = store.historyFor(NORTHWIND, oldRow.id);
    assert.equal(history.some((row) => row.changeKind === "supersession"), true);
    assert.equal(
      store.audits.some((row) => row.action === "brain.fact.superseded"),
      true,
    );
    const useOld = evaluateFactUse({
      fact: oldRow,
      source: store.getSource(NORTHWIND, owner.id),
      intendedUse: "customer_facing_claim",
    });
    assert.equal(useOld.allowed, false);
  });
});

describe("Business isolation", () => {
  it("does not return another business's facts", () => {
    const store = new MemoryBrainStore();
    store.createFact(NORTHWIND, {
      subject: "business",
      attribute: "name",
      valueText: "Northwind Workshops",
      status: "UNKNOWN",
      risk: "LOW",
      freshness: "CURRENT_ENOUGH",
      domain: "identity",
    });
    store.createFact(CEDAR, {
      subject: "business",
      attribute: "name",
      valueText: "Cedar Goods",
      status: "UNKNOWN",
      risk: "LOW",
      freshness: "CURRENT_ENOUGH",
      domain: "identity",
    });
    assert.deepEqual(
      store.listFacts(NORTHWIND).map((row) => row.valueText),
      ["Northwind Workshops"],
    );
    assert.throws(() =>
      store.getFact(NORTHWIND, store.listFacts(CEDAR)[0].id),
    );
    assert.deepEqual(store.factsForRelatedBusiness(), []);
  });

  it("does not let a related business inherit facts", () => {
    const store = new MemoryBrainStore();
    const fact = store.createFact(NORTHWIND, {
      subject: "business",
      attribute: "brand_boundary",
      valueText: "Keep Northwind separate from Cedar.",
      status: "UNKNOWN",
      risk: "HIGH",
      freshness: "CURRENT_ENOUGH",
      domain: "brand_boundaries",
    });
    store.createRelationship(NORTHWIND, {
      fromKind: "business",
      fromRef: NORTHWIND,
      toKind: "business",
      toRef: CEDAR,
      relationType: "related_business",
      evidenceFactId: fact.id,
      evidenceObservationId: null,
      status: "recorded",
      notes: "Shared ownership does not merge knowledge.",
    });
    assert.equal(store.listFacts(CEDAR).length, 0);
  });
});

describe("Existing Brain compatibility", () => {
  it("keeps the owner-facing Brain as the legacy row", () => {
    const brain = northwindBrain();
    assert.equal(readOwnerFacingBrain(brain)?.industry, "workshops");
    assert.equal(readOwnerFacingBrain(null), null);
  });

  it("snapshots legacy rows without auto-VERIFIED promotion", () => {
    const store = new MemoryBrainStore();
    const brain = northwindBrain();
    const result = snapshotLegacyBrain(store, brain);
    const facts = result.factIds.map((factId) => store.getFact(NORTHWIND, factId)!);
    assert.equal(snapshotPromotedAnyVerified(facts), false);
    assert.equal(facts.some((fact) => fact.status === "UNKNOWN"), true);
    const inferred = facts.find((fact) => fact.attribute === "inferred_summary");
    assert.equal(inferred?.status, "PROVISIONAL");
    assert.equal(inferred?.sourceClass, "S6");
    assert.equal(
      facts.every((fact) => !Object.prototype.hasOwnProperty.call(fact, "confidence")),
      true,
    );
    assert.equal(FUTURE_BRAIN_MIGRATION_STEPS.length > 3, true);
  });

  it("refuses to create a fact already marked VERIFIED", () => {
    const store = new MemoryBrainStore();
    assert.throws(() =>
      store.createFact(NORTHWIND, {
        subject: "business",
        attribute: "industry",
        valueText: "workshops",
        status: "VERIFIED",
        risk: "LOW",
        freshness: "CURRENT_ENOUGH",
        domain: "identity",
      }),
    );
  });

  it("still reads business_brains from the live schema and app", () => {
    const schema = readFileSync(join(process.cwd(), "src/lib/db/schema.ts"), "utf8");
    const queries = readFileSync(join(process.cwd(), "src/lib/growth/queries.ts"), "utf8");
    const page = readFileSync(
      join(process.cwd(), "src/app/(app)/app/business/page.tsx"),
      "utf8",
    );
    assert.match(schema, /export const businessBrains/);
    assert.match(queries, /from\(businessBrains\)/);
    assert.match(page, /BusinessBrainForm/);
    assert.match(page, /not a new\s+Fact system/);
  });
});

describe("Audit, fences, and owner screens", () => {
  it("audits fact creation, correction, and supersession", () => {
    const store = new MemoryBrainStore();
    const owner = store.createSource(NORTHWIND, {
      sourceClass: "S1",
      name: "Owner",
      domain: "strategy",
      kind: "owner_confirmation",
    });
    const fact = store.createFact(NORTHWIND, {
      subject: "business",
      attribute: "goal_note",
      valueText: "More weekend bookings",
      status: "PROVISIONAL",
      risk: "LOW",
      freshness: "CURRENT_ENOUGH",
      sourceId: owner.id,
      domain: "strategy",
    });
    store.ownerCorrectFact(
      NORTHWIND,
      fact.id,
      "Fill weekday workshops too",
      owner.id,
      "Owner corrected the goal note.",
    );
    const actions = store.audits.map((row) => row.action);
    assert.equal(actions.includes("brain.fact.created"), true);
    assert.equal(actions.includes("brain.fact.owner_corrected"), true);
  });

  it("keeps A3/A4 and execute off and grants no new external action", () => {
    assert.equal(executionEnabled(), false);
    assert.equal(
      requestExecute({
        organizationId: NORTHWIND,
        actionId: CEDAR,
        title: "Publish from a fact",
      }).status,
      "off",
    );
    const moduleSource = [
      readFileSync(join(process.cwd(), "src/lib/brain/gate.ts"), "utf8"),
      readFileSync(join(process.cwd(), "src/lib/brain/store.ts"), "utf8"),
      readFileSync(join(process.cwd(), "src/lib/brain/queries.ts"), "utf8"),
    ].join("\n");
    assert.doesNotMatch(moduleSource, /requestExecute|requestCmsPublish|executionEnabled\(\)/);
  });

  it("does not expose S1–S6 codes on ordinary owner screens (AT-UX-01)", () => {
    const files = [
      "src/app/(app)/app/business/page.tsx",
      "src/app/(app)/app/page.tsx",
      "src/app/(app)/app/grow/page.tsx",
      "src/app/(app)/app/work/page.tsx",
      "src/app/(app)/app/results/page.tsx",
      "src/components/business-brain-form.tsx",
      "src/components/app-shell.tsx",
    ];
    for (const file of files) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      assert.doesNotMatch(source, /\bS1\b|\bS2\b|\bS3\b|\bS4\b|\bS5\b|\bS6\b/);
      assert.doesNotMatch(source, /Fact-Use Gate|SUPERSEDED|NEEDS_OWNER_CONFIRMATION/);
    }
  });

  it("adds only additive, tenant-scoped tables and does not drop business_brains", () => {
    const sql = readFileSync(
      join(process.cwd(), "drizzle/0047_brain_facts.sql"),
      "utf8",
    );
    assert.doesNotMatch(sql, /DROP TABLE/i);
    assert.doesNotMatch(sql, /ALTER TABLE "business_brains"/);
    for (const table of [
      "brain_sources",
      "brain_intake_items",
      "brain_observations",
      "brain_facts",
      "brain_fact_history",
      "brain_contradictions",
      "brain_contradiction_members",
      "brain_relationships",
    ]) {
      assert.match(sql, new RegExp(`CREATE TABLE "${table}"`));
      const start = sql.indexOf(`CREATE TABLE "${table}"`);
      const end = sql.indexOf(";", start);
      const create = sql.slice(start, end);
      assert.match(create, /"organization_id" uuid NOT NULL/);
    }
  });

  it("scopes drizzle accessors to the active organization", () => {
    const queries = readFileSync(join(process.cwd(), "src/lib/brain/queries.ts"), "utf8");
    assert.match(queries, /assertSameOrganization/);
    assert.match(queries, /from\(businessBrains\)/);
    assert.match(queries, /from\(brainFacts\)/);
  });
});
