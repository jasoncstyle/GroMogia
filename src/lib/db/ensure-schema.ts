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

  const goalProgress = (await sql.query(
    "select to_regclass('public.goal_progress_snapshots') as name",
  )) as RegistryRow[];

  if (!goalProgress[0]?.name) {
    await applyMigration(sql, "0021_v2_goal_progress.sql");
  }

  const builderInspiration = (await sql.query(
    "select to_regclass('public.builder_inspiration') as name",
  )) as RegistryRow[];

  if (!builderInspiration[0]?.name) {
    await applyMigration(sql, "0022_v2_builder_inspiration.sql");
  }

  const growthActionTitle = (await sql.query(
    `select 1 as name
     from information_schema.columns
     where table_schema = 'public'
       and table_name = 'growth_actions'
       and column_name = 'title'`,
  )) as RegistryRow[];

  if (!growthActionTitle[0]?.name) {
    await applyMigration(sql, "0023_growth_action_evidence.sql");
  }

  const brainSeoContext = (await sql.query(
    `select 1 as name
     from information_schema.columns
     where table_schema = 'public'
       and table_name = 'business_brains'
       and column_name = 'ideal_customers'`,
  )) as RegistryRow[];

  if (!brainSeoContext[0]?.name) {
    await applyMigration(sql, "0024_business_brain_seo_context.sql");
  }

  const keywordTable = (await sql.query(
    "select to_regclass('public.keywords') as name",
  )) as RegistryRow[];

  if (!keywordTable[0]?.name) {
    await applyMigration(sql, "0025_keyword_history.sql");
  }

  const keywordScore = (await sql.query(
    `select 1 as name
     from information_schema.columns
     where table_schema = 'public'
       and table_name = 'keywords'
       and column_name = 'opportunity_score'`,
  )) as RegistryRow[];

  if (!keywordScore[0]?.name) {
    await applyMigration(sql, "0026_keyword_opportunity_score.sql");
  }

  const serpNotesTable = (await sql.query(
    "select to_regclass('public.serp_notes') as name",
  )) as RegistryRow[];

  if (!serpNotesTable[0]?.name) {
    await applyMigration(sql, "0027_serp_notes.sql");
  }

  const contentGapsTable = (await sql.query(
    "select to_regclass('public.content_gaps') as name",
  )) as RegistryRow[];

  if (!contentGapsTable[0]?.name) {
    await applyMigration(sql, "0028_content_gaps.sql");
  }

  const contentBriefsTable = (await sql.query(
    "select to_regclass('public.content_briefs') as name",
  )) as RegistryRow[];

  if (!contentBriefsTable[0]?.name) {
    await applyMigration(sql, "0029_content_briefs.sql");
  }

  const contentDraftsTable = (await sql.query(
    "select to_regclass('public.content_drafts') as name",
  )) as RegistryRow[];

  if (!contentDraftsTable[0]?.name) {
    await applyMigration(sql, "0030_content_drafts.sql");
  }

  const internalLinkTable = (await sql.query(
    "select to_regclass('public.internal_link_suggestions') as name",
  )) as RegistryRow[];
  const pageSchemaTable = (await sql.query(
    "select to_regclass('public.page_schema_facts') as name",
  )) as RegistryRow[];

  if (!internalLinkTable[0]?.name || !pageSchemaTable[0]?.name) {
    await applyMigration(sql, "0031_page_structure.sql");
  }

  const geoNotesTable = (await sql.query(
    "select to_regclass('public.geo_notes') as name",
  )) as RegistryRow[];

  if (!geoNotesTable[0]?.name) {
    await applyMigration(sql, "0032_geo_notes.sql");
  }

  const geoQueriesTable = (await sql.query(
    "select to_regclass('public.geo_queries') as name",
  )) as RegistryRow[];

  if (!geoQueriesTable[0]?.name) {
    await applyMigration(sql, "0033_geo_queries.sql");
  }

  const geoHistoryTable = (await sql.query(
    "select to_regclass('public.geo_history') as name",
  )) as RegistryRow[];

  if (!geoHistoryTable[0]?.name) {
    await applyMigration(sql, "0034_geo_history.sql");
  }

  const geoAuditsTable = (await sql.query(
    "select to_regclass('public.geo_audits') as name",
  )) as RegistryRow[];

  if (!geoAuditsTable[0]?.name) {
    await applyMigration(sql, "0035_geo_audits.sql");
  }

  const cmsPublishTable = (await sql.query(
    "select to_regclass('public.cms_publish_requests') as name",
  )) as RegistryRow[];

  if (!cmsPublishTable[0]?.name) {
    await applyMigration(sql, "0036_cms_publish_requests.sql");
  }

  const channelScoresTable = (await sql.query(
    "select to_regclass('public.channel_scores') as name",
  )) as RegistryRow[];

  if (!channelScoresTable[0]?.name) {
    await applyMigration(sql, "0037_channel_scores.sql");
  }

  const beforeAfterTable = (await sql.query(
    "select to_regclass('public.before_after_looks') as name",
  )) as RegistryRow[];

  if (!beforeAfterTable[0]?.name) {
    await applyMigration(sql, "0038_before_after_looks.sql");
  }

  const executionTable = (await sql.query(
    "select to_regclass('public.execution_requests') as name",
  )) as RegistryRow[];

  if (!executionTable[0]?.name) {
    await applyMigration(sql, "0039_execution_requests.sql");
  }

  const competitorSitesTable = (await sql.query(
    "select to_regclass('public.competitor_sites') as name",
  )) as RegistryRow[];

  if (!competitorSitesTable[0]?.name) {
    await applyMigration(sql, "0040_competitor_sites.sql");
  }

  const competeMovesTable = (await sql.query(
    "select to_regclass('public.compete_moves') as name",
  )) as RegistryRow[];

  if (!competeMovesTable[0]?.name) {
    await applyMigration(sql, "0041_compete_moves.sql");
  }

  const botAccessTable = (await sql.query(
    "select to_regclass('public.bot_access_tokens') as name",
  )) as RegistryRow[];

  if (!botAccessTable[0]?.name) {
    await applyMigration(sql, "0042_bot_access_tokens.sql");
  }
}
