#!/usr/bin/env node
const { spawnSync } = require('node:child_process');

const result = spawnSync('prisma', ['db', 'push'], {
  encoding: 'utf8',
  shell: true
});

const output = `${result.stdout || ''}${result.stderr || ''}`;

if (result.error || /prisma: not found/i.test(output)) {
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
