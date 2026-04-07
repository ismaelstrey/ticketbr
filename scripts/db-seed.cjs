#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");

function runLocalTsx(seedPath) {
  const cliPath = path.resolve(__dirname, "..", "node_modules", "tsx", "dist", "cli.mjs");
  if (!fs.existsSync(cliPath)) return null;
  return spawnSync(process.execPath, [cliPath, seedPath], {
    encoding: "utf8",
    shell: false
  });
}

function runGlobalTsx(seedPath) {
  return spawnSync("tsx", [seedPath], {
    encoding: "utf8",
    shell: true
  });
}

function shouldFallbackToLocal(output) {
  return (
    /is not recognized as an internal or external command/i.test(output) ||
    /não é reconhecido como um comando interno/i.test(output) ||
    /tsx: not found/i.test(output) ||
    /execu[cç][aã]o de scripts foi desabilitada/i.test(output)
  );
}

const seedFile = path.resolve(__dirname, "..", "prisma", "seed.ts");
if (!fs.existsSync(seedFile)) {
  console.warn("[db:seed] Seed file not found. Skipping.");
  process.exit(0);
}

let result = runLocalTsx(seedFile);
let tried = "local";

if (!result) {
  result = runGlobalTsx(seedFile);
  tried = "global";
}

let output = `${result?.stdout || ""}${result?.stderr || ""}`;

if (tried === "global" && shouldFallbackToLocal(output)) {
  const again = runLocalTsx(seedFile);
  if (again) {
    result = again;
    output = `${result.stdout || ""}${result.stderr || ""}`;
    tried = "local";
  }
}

if (!result) {
  console.warn("[db:seed] TSX runner not available. Skipping seed.");
  process.exit(0);
}

process.stdout.write(result.stdout || "");
process.stderr.write(result.stderr || "");
process.exit(result.status ?? 1);

