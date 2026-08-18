import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.log("Skipping database migrate: DATABASE_URL is not set.");
  process.exit(0);
}

const result = spawnSync("npx", ["drizzle-kit", "migrate"], {
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
