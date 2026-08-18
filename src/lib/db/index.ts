import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { isDatabaseConfigured } from "@/lib/env";
import * as schema from "@/lib/db/schema";

export function getDb() {
  if (!isDatabaseConfigured()) {
    return null;
  }

  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}
