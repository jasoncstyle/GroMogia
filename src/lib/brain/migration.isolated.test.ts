import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";

const PG_BIN = "/usr/lib/postgresql/16/bin";
const PORT = String(20000 + (process.pid % 20000));
const ORG_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ORG_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const SOURCE_A = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const SOURCE_B = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const OFFER_B = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";

const BRAIN_TABLES = [
  "brain_sources",
  "brain_intake_items",
  "brain_observations",
  "brain_facts",
  "brain_fact_history",
  "brain_contradictions",
  "brain_contradiction_members",
  "brain_relationships",
] as const;

function applySqlFile(psqlArgs: string[], filePath: string) {
  const sql = readFileSync(filePath, "utf8");
  const statements = sql
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);
  for (const statement of statements) {
    execFileSync("psql", [...psqlArgs, "-v", "ON_ERROR_STOP=1", "-c", statement], {
      encoding: "utf8",
    });
  }
}

describe("0047 isolated PostgreSQL migration", { timeout: 120_000 }, () => {
  let dataDir = "";
  let psqlArgs: string[] = [];
  let started = false;

  before(() => {
    const initdb = join(PG_BIN, "initdb");
    const pgCtl = join(PG_BIN, "pg_ctl");
    assert.equal(spawnSync(initdb, ["--version"]).status, 0, "isolated PostgreSQL initdb must exist");
    dataDir = mkdtempSync(join(tmpdir(), "groovgro-phase-c-pg-"));
    execFileSync(initdb, ["-D", dataDir, "--auth=trust", "--no-sync", "-U", "ubuntu", "-A", "trust"], {
      encoding: "utf8",
    });
    execFileSync(
      pgCtl,
      ["-D", dataDir, "-l", join(dataDir, "pg.log"), "-o", `-p ${PORT} -k ${dataDir}`, "-w", "start"],
      { encoding: "utf8" },
    );
    started = true;
    psqlArgs = ["-h", dataDir, "-p", PORT, "-U", "ubuntu", "-d", "postgres"];
    execFileSync("psql", [...psqlArgs, "-c", "CREATE DATABASE groovgro_phase_c;"], {
      encoding: "utf8",
    });
    psqlArgs = ["-h", dataDir, "-p", PORT, "-U", "ubuntu", "-d", "groovgro_phase_c"];
  });

  after(() => {
    if (started) {
      spawnSync(join(PG_BIN, "pg_ctl"), ["-D", dataDir, "-m", "immediate", "stop"], {
        encoding: "utf8",
      });
    }
    if (dataDir) {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });

  it("creates the eight tables, composite tenant FKs, and leaves business_brains unchanged", () => {
    const bootstrap = `
      CREATE TABLE organizations (
        id uuid PRIMARY KEY,
        slug text NOT NULL UNIQUE,
        name text NOT NULL,
        status text NOT NULL DEFAULT 'active',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE offers (
        id uuid PRIMARY KEY,
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name text NOT NULL DEFAULT ''
      );
      CREATE TABLE business_brains (
        organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
        industry text NOT NULL DEFAULT '',
        confidence integer NOT NULL DEFAULT 0
      );
    `;
    execFileSync("psql", [...psqlArgs, "-v", "ON_ERROR_STOP=1", "-c", bootstrap], {
      encoding: "utf8",
    });
    execFileSync(
      "psql",
      [
        ...psqlArgs,
        "-c",
        `INSERT INTO organizations (id, slug, name) VALUES ('${ORG_A}', 'northwind', 'Northwind'), ('${ORG_B}', 'cedar', 'Cedar');
         INSERT INTO offers (id, organization_id, name) VALUES ('${OFFER_B}', '${ORG_B}', 'Tote');
         INSERT INTO business_brains (organization_id, industry, confidence) VALUES ('${ORG_A}', 'workshops', 40);`,
      ],
      { encoding: "utf8" },
    );

    applySqlFile(psqlArgs, join(process.cwd(), "drizzle/0047_brain_facts.sql"));

    const tables = execFileSync(
      "psql",
      [
        ...psqlArgs,
        "-At",
        "-c",
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'brain_%' ORDER BY 1;",
      ],
      { encoding: "utf8" },
    )
      .trim()
      .split("\n");
    assert.deepEqual(tables, [...BRAIN_TABLES].sort());

    const composite = execFileSync(
      "psql",
      [
        ...psqlArgs,
        "-At",
        "-c",
        "SELECT conname FROM pg_constraint WHERE conname LIKE '%_org_fk' ORDER BY 1;",
      ],
      { encoding: "utf8" },
    );
    assert.match(composite, /brain_facts_source_org_fk/);
    assert.match(composite, /brain_observations_source_org_fk/);
    assert.match(composite, /brain_observations_related_fact_org_fk/);
    assert.match(composite, /brain_facts_offering_org_fk/);
    assert.match(composite, /brain_fact_history_fact_org_fk/);
    assert.match(composite, /brain_contradiction_members_contradiction_org_fk/);

    const indexes = execFileSync(
      "psql",
      [
        ...psqlArgs,
        "-At",
        "-c",
        "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'brain_%' ORDER BY 1;",
      ],
      { encoding: "utf8" },
    );
    assert.match(indexes, /brain_facts_id_org_idx/);
    assert.match(indexes, /brain_sources_org_idx/);

    const brainCols = execFileSync(
      "psql",
      [
        ...psqlArgs,
        "-At",
        "-c",
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'business_brains' ORDER BY 1;",
      ],
      { encoding: "utf8" },
    ).trim();
    assert.equal(brainCols, "confidence\nindustry\norganization_id");

    execFileSync(
      "psql",
      [
        ...psqlArgs,
        "-c",
        `INSERT INTO brain_sources (id, organization_id, source_class, name, domain, kind)
         VALUES ('${SOURCE_A}', '${ORG_A}', 'S3', 'Hours page', 'operations', 'business_controlled'),
                ('${SOURCE_B}', '${ORG_B}', 'S2', 'Catalog', 'inventory', 'system_of_record');`,
      ],
      { encoding: "utf8" },
    );
    execFileSync(
      "psql",
      [
        ...psqlArgs,
        "-c",
        `INSERT INTO brain_facts (organization_id, subject, attribute, value_text, status, risk, freshness, source_id, source_class, domain)
         VALUES ('${ORG_A}', 'studio', 'hours', 'Tue-Sat', 'PROVISIONAL', 'LOW', 'CURRENT_ENOUGH', '${SOURCE_A}', 'S3', 'operations');`,
      ],
      { encoding: "utf8" },
    );

    const crossSource = spawnSync(
      "psql",
      [
        ...psqlArgs,
        "-v",
        "ON_ERROR_STOP=1",
        "-c",
        `INSERT INTO brain_facts (organization_id, subject, attribute, value_text, status, risk, freshness, source_id, source_class, domain)
         VALUES ('${ORG_A}', 'studio', 'stolen', 'no', 'UNKNOWN', 'LOW', 'CURRENT_ENOUGH', '${SOURCE_B}', 'S2', 'inventory');`,
      ],
      { encoding: "utf8" },
    );
    assert.notEqual(crossSource.status, 0);
    assert.match(crossSource.stderr, /brain_facts_source_org_fk|foreign key/i);

    const crossOffer = spawnSync(
      "psql",
      [
        ...psqlArgs,
        "-v",
        "ON_ERROR_STOP=1",
        "-c",
        `INSERT INTO brain_facts (organization_id, subject, attribute, value_text, status, risk, freshness, offering_id, domain)
         VALUES ('${ORG_A}', 'workshop', 'name', 'no', 'UNKNOWN', 'LOW', 'CURRENT_ENOUGH', '${OFFER_B}', 'offering');`,
      ],
      { encoding: "utf8" },
    );
    assert.notEqual(crossOffer.status, 0);
    assert.match(crossOffer.stderr, /brain_facts_offering_org_fk|foreign key/i);

    const existsCheck = execFileSync(
      "psql",
      [...psqlArgs, "-At", "-c", "SELECT to_regclass('public.brain_facts');"],
      { encoding: "utf8" },
    ).trim();
    assert.equal(existsCheck, "brain_facts");
    const rerun = spawnSync(
      "psql",
      [
        ...psqlArgs,
        "-v",
        "ON_ERROR_STOP=1",
        "-c",
        'CREATE TABLE "brain_facts" ("id" uuid PRIMARY KEY);',
      ],
      { encoding: "utf8" },
    );
    assert.notEqual(rerun.status, 0);
    assert.match(rerun.stderr, /already exists/i);

    execFileSync(
      "psql",
      [
        ...psqlArgs,
        "-c",
        `DROP TABLE IF EXISTS brain_relationships;
         DROP TABLE IF EXISTS brain_contradiction_members;
         DROP TABLE IF EXISTS brain_contradictions;
         DROP TABLE IF EXISTS brain_fact_history;
         DROP TABLE IF EXISTS brain_observations;
         DROP TABLE IF EXISTS brain_facts;
         DROP TABLE IF EXISTS brain_intake_items;
         DROP TABLE IF EXISTS brain_sources;
         DROP INDEX IF EXISTS "offers_id_org_idx";`,
      ],
      { encoding: "utf8" },
    );
    const gone = execFileSync(
      "psql",
      [...psqlArgs, "-At", "-c", "SELECT to_regclass('public.brain_facts');"],
      { encoding: "utf8" },
    ).trim();
    assert.equal(gone, "");
    const stillBrain = execFileSync(
      "psql",
      [...psqlArgs, "-At", "-c", "SELECT industry FROM business_brains WHERE organization_id = '${ORG_A}';".replace("${ORG_A}", ORG_A)],
      { encoding: "utf8" },
    ).trim();
    assert.equal(stillBrain, "workshops");

    applySqlFile(psqlArgs, join(process.cwd(), "drizzle/0047_brain_facts.sql"));
    const restored = execFileSync(
      "psql",
      [...psqlArgs, "-At", "-c", "SELECT to_regclass('public.brain_facts');"],
      { encoding: "utf8" },
    ).trim();
    assert.equal(restored, "brain_facts");
  });
});
