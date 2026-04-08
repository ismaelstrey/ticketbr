#!/usr/bin/env node

const { spawnSync } = require("node:child_process");

const shouldRunMigrate = process.env.RUN_DB_MIGRATE_ON_BUILD === "true";
const strict = process.env.RUN_DB_MIGRATE_STRICT === "true";
const retries = Number(process.env.RUN_DB_MIGRATE_RETRIES || "4");
const retryDelayMs = Number(process.env.RUN_DB_MIGRATE_RETRY_DELAY_MS || "3000");
const disableAdvisoryLock = process.env.RUN_DB_MIGRATE_DISABLE_ADVISORY_LOCK === "true";

function sleep(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return;
  const buf = new SharedArrayBuffer(4);
  const view = new Int32Array(buf);
  Atomics.wait(view, 0, 0, ms);
}

function runMigrate() {
  const env = { ...process.env };
  if (disableAdvisoryLock) {
    env.PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK = env.PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK || "1";
  }

  const result = spawnSync(process.execPath, ["scripts/db-migrate.cjs"], {
    env,
    encoding: "utf8",
    shell: false
  });

  process.stdout.write(result.stdout || "");
  process.stderr.write(result.stderr || "");

  const output = `${result.stdout || ""}${result.stderr || ""}`;
  return {
    status: result.status ?? 1,
    output
  };
}

function isAdvisoryLockTimeout(output) {
  return (
    /pg_advisory_lock\(/i.test(output) ||
    /advisory lock/i.test(output) ||
    /Timeout:\s*10000ms/i.test(output) ||
    /Error:\s*P1002/i.test(output)
  );
}

if (!shouldRunMigrate) {
  console.log("[postbuild] Skipping DB migration. Set RUN_DB_MIGRATE_ON_BUILD=true to enable.");
  process.exit(0);
}

console.log("[postbuild] Running DB migration...");

for (let attempt = 0; attempt <= retries; attempt += 1) {
  const result = runMigrate();
  if (result.status === 0) {
    console.log("[postbuild] DB migration completed.");
    process.exit(0);
  }

  const advisoryLockTimeout = isAdvisoryLockTimeout(result.output);
  const isLastAttempt = attempt >= retries;

  if (advisoryLockTimeout && !isLastAttempt) {
    console.warn(
      `[postbuild] DB migration lock timeout. Retrying (${attempt + 1}/${retries}) in ${retryDelayMs}ms...`
    );
    sleep(retryDelayMs);
    continue;
  }

  console.error("[postbuild] DB migration failed.");
  if (strict) {
    process.exit(1);
  }
  console.warn("[postbuild] Continuing build without blocking (RUN_DB_MIGRATE_STRICT=false).");
  process.exit(0);
}
