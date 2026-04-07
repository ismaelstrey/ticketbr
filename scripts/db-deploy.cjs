#!/usr/bin/env node
const { spawnSync } = require("node:child_process");

function run(command) {
  return spawnSync(command, {
    encoding: "utf8",
    shell: true,
    stdio: "inherit"
  });
}

const migrate = run("npm run -s db:migrate");
if (migrate.status !== 0) {
  process.exit(migrate.status ?? 1);
}

const shouldSeed =
  String(process.env.RUN_SEED || "").toLowerCase() === "true" ||
  String(process.env.RUN_SEED || "") === "1";

if (!shouldSeed) {
  process.exit(0);
}

const seed = run("npm run -s db:seed");
process.exit(seed.status ?? 1);

