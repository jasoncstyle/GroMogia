import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { neon } from "@neondatabase/serverless";

import { isDatabaseConfigured } from "@/lib/env";

type RegistryRow = { name: string | null };

export async function ensureSchema(): Promise<void> {
  if (!isDatabaseConfigured()) return;

  const sql = neon(process.env.DATABASE_URL!);
  const existing = (await sql.query(
    "select to_regclass('public.users') as name",
  )) as RegistryRow[];

  if (existing[0]?.name) {
    return;
  }

  const migrationPath = join(
    process.cwd(),
    "drizzle/0000_phase1_foundation.sql",
  );
  const file = await readFile(migrationPath, "utf8");
  const statements = file
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await sql.query(statement);
  }
}
