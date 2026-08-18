import { spawnSync } from "node:child_process";

const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.log("Skipping database migrate: DATABASE_URL is not set.");
  process.exit(0);
}

const result = spawnSync("npx", ["drizzle-kit", "migrate"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: databaseUrl },
});

process.exit(result.status ?? 1);
