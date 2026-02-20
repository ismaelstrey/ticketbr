#!/usr/bin/env node
const { spawnSync } = require('node:child_process');

function runPrismaDbPush() {
  const prismaBin = process.platform === 'win32' ? 'prisma.cmd' : 'prisma';
  return spawnSync(prismaBin, ['db', 'push'], { encoding: 'utf8' });
}

const result = runPrismaDbPush();
const output = `${result.stdout || ''}${result.stderr || ''}`;

if (result.error) {
  if (result.error.code === 'ENOENT') {
    console.error('[db:push] Prisma CLI não encontrado no ambiente.');
  } else {
    console.error(`[db:push] Falha ao executar Prisma CLI: ${result.error.message}`);
  }
  process.exit(1);
}

if (result.status === 0) {
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  process.exit(0);
}

const hasEnumDuplicateError =
  /Error:\s*P2002/.test(output) && /enum_nsp`,`enum_name/.test(output);

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
