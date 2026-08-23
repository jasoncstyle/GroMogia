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

  const builderRows = (await sql.query(
    "select to_regclass('public.builder_rows') as name",
  )) as RegistryRow[];

  if (!builderRows[0]?.name) {
    await applyMigration(sql, "0008_phase7_builder_rows.sql");
  }

  const builderTheme = (await sql.query(
    `select 1 as name
     from information_schema.columns
     where table_schema = 'public'
       and table_name = 'builder_sites'
       and column_name = 'theme'`,
  )) as RegistryRow[];

  if (!builderTheme[0]?.name) {
    await applyMigration(sql, "0009_phase7_builder_style.sql");
  }

  const builderRowWidth = (await sql.query(
    `select 1 as name
     from information_schema.columns
     where table_schema = 'public'
       and table_name = 'builder_rows'
       and column_name = 'content_width'`,
  )) as RegistryRow[];

  if (!builderRowWidth[0]?.name) {
    await applyMigration(sql, "0010_phase7_builder_row_width.sql");
  }

  const builderTemplateId = (await sql.query(
    `select 1 as name
     from information_schema.columns
     where table_schema = 'public'
       and table_name = 'builder_sites'
       and column_name = 'template_id'`,
  )) as RegistryRow[];

  if (!builderTemplateId[0]?.name) {
    await applyMigration(sql, "0011_phase7_builder_template_id.sql");
  }

  const builderPageSlug = (await sql.query(
    `select 1 as name
     from information_schema.columns
     where table_schema = 'public'
       and table_name = 'builder_sites'
       and column_name = 'slug'`,
  )) as RegistryRow[];

  if (!builderPageSlug[0]?.name) {
    await applyMigration(sql, "0012_phase7_builder_page_slug.sql");
  }

  const seoPageId = (await sql.query(
    `select 1 as name
     from information_schema.columns
     where table_schema = 'public'
       and table_name = 'seo_audits'
       and column_name = 'builder_site_id'`,
  )) as RegistryRow[];

  if (!seoPageId[0]?.name) {
    await applyMigration(sql, "0013_phase6_seo_page_id.sql");
  }

  const mediaPublicUrl = (await sql.query(
    `select 1 as name
     from information_schema.columns
     where table_schema = 'public'
       and table_name = 'media_assets'
       and column_name = 'public_url'`,
  )) as RegistryRow[];

  if (!mediaPublicUrl[0]?.name) {
    await applyMigration(sql, "0014_phase7_media_urls.sql");
  }

  const builderInnerRows = (await sql.query(
    `select 1 as name
     from information_schema.columns
     where table_schema = 'public'
       and table_name = 'builder_rows'
       and column_name = 'parent_row_id'`,
  )) as RegistryRow[];

  if (!builderInnerRows[0]?.name) {
    await applyMigration(sql, "0015_phase7_builder_inner_rows.sql");
  }

  const builderChrome = (await sql.query(
    "select to_regclass('public.builder_chrome') as name",
  )) as RegistryRow[];

  if (!builderChrome[0]?.name) {
    await applyMigration(sql, "0016_phase7_builder_chrome.sql");
  }

  const builderChromeColors = (await sql.query(
    `select 1 as name
     from information_schema.columns
     where table_schema = 'public'
       and table_name = 'builder_chrome'
       and column_name = 'header_background_color'`,
  )) as RegistryRow[];

  if (!builderChromeColors[0]?.name) {
    await applyMigration(sql, "0017_phase7_builder_chrome_colors.sql");
  }

  const businessBrains = (await sql.query(
    "select to_regclass('public.business_brains') as name",
  )) as RegistryRow[];

  if (!businessBrains[0]?.name) {
    await applyMigration(sql, "0018_v2_growth_foundation.sql");
  }

  const offerDiscovery = (await sql.query(
    `select 1 as name
     from information_schema.columns
     where table_schema = 'public'
       and table_name = 'offers'
       and column_name = 'discovery_status'`,
  )) as RegistryRow[];

  if (!offerDiscovery[0]?.name) {
    await applyMigration(sql, "0019_v2_growth_discovery.sql");
  }

  const discoveredPages = (await sql.query(
    "select to_regclass('public.website_discovered_pages') as name",
  )) as RegistryRow[];

  if (!discoveredPages[0]?.name) {
    await applyMigration(sql, "0020_v2_website_page_checklist.sql");
  }
}
