import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { neon } from "@neondatabase/serverless";

import { isDatabaseConfigured } from "@/lib/env";

type RegistryRow = { name: string | null };

async function applyMigration(
  sql: { query: (query: string) => Promise<unknown> },
  fileName: string,
) {
  const migrationPath = join(process.cwd(), "drizzle", fileName);
  const file = await readFile(migrationPath, "utf8");
  const statements = file
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await sql.query(statement);
  }
}

export async function ensureSchema(): Promise<void> {
  if (!isDatabaseConfigured()) return;

  const sql = neon(process.env.DATABASE_URL!);
  const users = (await sql.query(
    "select to_regclass('public.users') as name",
  )) as RegistryRow[];

  if (!users[0]?.name) {
    await applyMigration(sql, "0000_phase1_foundation.sql");
  }

  const contacts = (await sql.query(
    "select to_regclass('public.contacts') as name",
  )) as RegistryRow[];

  if (!contacts[0]?.name) {
    await applyMigration(sql, "0001_phase2_business_data.sql");
  }

  const brandVoice = (await sql.query(
    "select to_regclass('public.brand_voice_profiles') as name",
  )) as RegistryRow[];

  if (!brandVoice[0]?.name) {
    await applyMigration(sql, "0002_phase5_brand_voice.sql");
  }

  const seo = (await sql.query(
    "select to_regclass('public.seo_audits') as name",
  )) as RegistryRow[];

  if (!seo[0]?.name) {
    await applyMigration(sql, "0003_phase6_seo.sql");
  }

  const seoDrafts = (await sql.query(
    "select to_regclass('public.seo_drafts') as name",
  )) as RegistryRow[];

  if (!seoDrafts[0]?.name) {
    await applyMigration(sql, "0004_phase6_seo_drafts.sql");
  }

  const searchConsole = (await sql.query(
    "select to_regclass('public.search_console_snapshots') as name",
  )) as RegistryRow[];

  if (!searchConsole[0]?.name) {
    await applyMigration(sql, "0005_phase6_search_console.sql");
  }

  const builder = (await sql.query(
    "select to_regclass('public.builder_sites') as name",
  )) as RegistryRow[];

  if (!builder[0]?.name) {
    await applyMigration(sql, "0006_phase7_website_builder.sql");
  }

  const builderMeta = (await sql.query(
    `select 1 as name
     from information_schema.columns
     where table_schema = 'public'
       and table_name = 'builder_sites'
       and column_name = 'meta_description'`,
  )) as RegistryRow[];

  if (!builderMeta[0]?.name) {
    await applyMigration(sql, "0007_phase7_builder_seo.sql");
  }
}
