#!/usr/bin/env node

const { execSync } = require("node:child_process");

const shouldRunMigrate = process.env.RUN_DB_MIGRATE_ON_BUILD === "true";

if (!shouldRunMigrate) {
  console.log("[postbuild] Skipping DB migration. Set RUN_DB_MIGRATE_ON_BUILD=true to enable.");
  process.exit(0);
}

try {
  console.log("[postbuild] Running DB migration...");
  execSync("node scripts/db-migrate.cjs", { stdio: "inherit" });
} catch (error) {
  console.error("[postbuild] DB migration failed.");
  process.exit(1);
}
