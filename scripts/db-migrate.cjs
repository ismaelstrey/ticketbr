#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

function runLocalPrisma(args) {
  const cliPath = path.resolve(__dirname, '..', 'node_modules', 'prisma', 'build', 'index.js');
  if (!fs.existsSync(cliPath)) {
    return null;
  }
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf8',
    shell: false
  });
}

function runGlobalPrisma(args) {
  return spawnSync('prisma', args, {
    encoding: 'utf8',
    shell: true
  });
}

function shouldFallbackToLocal(output) {
  return (
    /is not recognized as an internal or external command/i.test(output) || // en-US
    /não é reconhecido como um comando interno/i.test(output) || // pt-BR
    /prisma: not found/i.test(output) ||
    /execu[cç][aã]o de scripts foi desabilitada/i.test(output) // PowerShell policy
  );
}

const args = ['migrate', 'deploy'];

let result = runLocalPrisma(args);
let tried = 'local';

if (!result) {
  result = runGlobalPrisma(args);
  tried = 'global';
}

let output = `${result?.stdout || ''}${result?.stderr || ''}`;

if (tried === 'global' && shouldFallbackToLocal(output)) {
  const again = runLocalPrisma(args);
  if (again) {
    result = again;
    output = `${result.stdout || ''}${result.stderr || ''}`;
    tried = 'local';
  }
}

if (!result) {
  console.warn('[db:migrate] Prisma CLI não disponível no ambiente. Pulando migração automaticamente.');
  process.exit(0);
}

if (result.status === 0) {
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  process.exit(0);
}

const hasBaselineIssue =
  /Error:\s*P3005/.test(output) && /No migration found in prisma[\\/]+migrations/.test(output);

if (hasBaselineIssue) {
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  console.warn(
    '\n[db:migrate] Banco existente sem baseline de migrations detectado (P3005). ' +
      'Continuando sem aplicar alterações automáticas para evitar conflito de objetos.\n'
  );
  process.exit(0);
}

process.stdout.write(result.stdout || '');
process.stderr.write(result.stderr || '');
process.exit(result.status ?? 1);
