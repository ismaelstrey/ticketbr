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
    /is not recognized as an internal or external command/i.test(output) ||
    /não é reconhecido como um comando interno/i.test(output) ||
    /prisma: not found/i.test(output) ||
    /execu[cç][aã]o de scripts foi desabilitada/i.test(output)
  );
}

const args = ['db', 'push'];

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
  console.error('[db:push] Prisma CLI não encontrado no ambiente.');
  process.exit(1);
}

if (result.status === 0) {
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  process.exit(0);
}

const hasEnumDuplicateError = /Error:\s*P2002/.test(output) && /enum_nsp`,`enum_name/.test(output);

if (hasEnumDuplicateError) {
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  console.warn(
    '\n[db:push] Detectado enum já existente no banco (P2002 em enum_nsp/enum_name). ' +
      'Seguindo sem falha para não bloquear deploy em banco já baselineado.\n'
  );
  process.exit(0);
}

process.stdout.write(result.stdout || '');
process.stderr.write(result.stderr || '');
process.exit(result.status ?? 1);
