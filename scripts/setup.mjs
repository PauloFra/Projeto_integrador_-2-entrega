#!/usr/bin/env node
/**
 * Preparação do ambiente em um único comando:
 *   1. cria os arquivos .env a partir dos .env.example (se ainda não existirem);
 *   2. aplica o schema do banco (migrate);
 *   3. carrega os dados de demonstração (seed).
 *
 * Uso:  npm run setup
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const copiarEnv = (pacote) => {
  const exemplo = path.join(raiz, pacote, '.env.example');
  const destino = path.join(raiz, pacote, '.env');
  if (!fs.existsSync(exemplo)) return;
  if (fs.existsSync(destino)) {
    console.log(`  .env de ${pacote} já existe — mantido como está.`);
    return;
  }
  fs.copyFileSync(exemplo, destino);
  console.log(`  .env de ${pacote} criado a partir do .env.example.`);
};

console.log('\n[1/2] Variáveis de ambiente');
copiarEnv('backend');
copiarEnv('frontend');

console.log('\n[2/2] Banco de dados (schema + carga de demonstração)');
const resultado = spawnSync('npm', ['run', 'db:setup', '--workspace', 'backend'], {
  cwd: raiz,
  stdio: 'inherit',
  shell: true,
});

if (resultado.status !== 0) {
  console.error('\nFalha ao preparar o banco de dados. Verifique a saída acima.');
  process.exit(resultado.status ?? 1);
}

console.log('\nAmbiente pronto. Suba o projeto com:  npm run dev\n');
