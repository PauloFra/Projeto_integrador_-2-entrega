/**
 * Apaga o arquivo SQLite e recria tudo do zero (schema + carga de demonstração).
 * Executar: npm run db:reset
 */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import config from '../config/index.js';
import { closeDatabase } from './connection.js';
import { seed } from './seed.js';

export const reset = () => {
  closeDatabase();
  for (const sufixo of ['', '-wal', '-shm']) {
    const arquivo = `${config.databaseFile}${sufixo}`;
    if (fs.existsSync(arquivo)) fs.rmSync(arquivo);
  }
  return seed();
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const resumo = reset();
  console.log(`[reset] banco recriado em ${config.databaseFile}`);
  console.table(resumo);
  closeDatabase();
}

export default reset;
