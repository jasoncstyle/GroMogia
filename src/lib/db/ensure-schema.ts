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
}
