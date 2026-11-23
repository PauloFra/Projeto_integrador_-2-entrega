import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import config from '../config/index.js';
import { getDatabase, closeDatabase } from './connection.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(here, 'schema.sql');

/** Aplica o schema.sql (idempotente: usa CREATE TABLE IF NOT EXISTS). */
export const migrate = () => {
  const db = getDatabase();
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);

  const tabelas = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .map((row) => row.name);

  return tabelas;
};

// Execução direta: node src/database/migrate.js
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const tabelas = migrate();
  console.log(`[migrate] banco: ${config.databaseFile}`);
  console.log(`[migrate] ${tabelas.length} tabelas prontas: ${tabelas.join(', ')}`);
  closeDatabase();
}

export default migrate;
