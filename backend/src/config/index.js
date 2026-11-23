import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Raiz do pacote backend (.../backend). */
export const backendRoot = path.resolve(here, '..', '..');

dotenv.config({ path: path.join(backendRoot, '.env') });

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const nodeEnv = process.env.NODE_ENV ?? 'development';
const databaseFile = process.env.DATABASE_FILE ?? './data/patas.db';

export const config = {
  nodeEnv,
  isTest: nodeEnv === 'test',
  isProduction: nodeEnv === 'production',
  port: toNumber(process.env.PORT, 3333),
  databaseFile: path.isAbsolute(databaseFile)
    ? databaseFile
    : path.resolve(backendRoot, databaseFile),
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  auth: {
    secret: process.env.AUTH_SECRET ?? 'patas-conectadas-poc-secret',
    tokenTtlHours: toNumber(process.env.AUTH_TOKEN_TTL_HOURS, 12),
  },
};

export default config;
