#!/usr/bin/env node
const { spawnSync } = require('node:child_process');

function runPrismaMigrateDeploy() {
  return spawnSync('prisma', ['migrate', 'deploy'], {
    encoding: 'utf8',
    shell: true
  });
}

const result = runPrismaMigrateDeploy();
const output = `${result.stdout || ''}${result.stderr || ''}`;

if (result.error || /prisma: not found/i.test(output)) {
  console.warn('[db:migrate] Prisma CLI não disponível no ambiente. Pulando migração automaticamente.');
  process.exit(0);
}

if (result.status === 0) {
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  process.exit(0);
}

const hasBaselineIssue = /Error:\s*P3005/.test(output) && /No migration found in prisma\/migrations/.test(output);

if (hasBaselineIssue) {
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  console.warn(
    '\n[db:migrate] Banco existente sem baseline de migrations detectado (P3005). ' +
      'Deploy continuará sem aplicar db push automático para evitar conflito de objetos (ex.: P2002 em enums).\n'
  );
  process.exit(0);
}

process.stdout.write(result.stdout || '');
process.stderr.write(result.stderr || '');
process.exit(result.status ?? 1);
