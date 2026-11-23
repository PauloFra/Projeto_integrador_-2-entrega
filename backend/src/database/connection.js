import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import config from '../config/index.js';

let instance = null;

/**
 * Conexão única (singleton) com o arquivo SQLite.
 * O diretório do banco é criado na primeira chamada, então um clone novo do
 * repositório só precisa rodar `npm run db:setup`.
 */
export const getDatabase = () => {
  if (instance) return instance;

  const directory = path.dirname(config.databaseFile);
  fs.mkdirSync(directory, { recursive: true });

  instance = new Database(config.databaseFile);
  instance.pragma('journal_mode = WAL');
  instance.pragma('foreign_keys = ON');
  return instance;
};

/** Fecha a conexão (usado pelos testes e pelo encerramento do processo). */
export const closeDatabase = () => {
  if (instance) {
    instance.close();
    instance = null;
  }
};

export default getDatabase;
