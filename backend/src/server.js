import fs from 'node:fs';
import config from './config/index.js';
import { criarApp } from './app.js';
import { getDatabase, closeDatabase } from './database/connection.js';

// Falha cedo e com mensagem clara se o banco ainda não foi criado.
if (!fs.existsSync(config.databaseFile)) {
  console.error(
    [
      '',
      'O banco de dados ainda não existe:',
      `  ${config.databaseFile}`,
      '',
      'Rode a preparação do repositório de dados antes de subir a API:',
      '  npm run db:setup      (dentro da pasta backend/)',
      '',
    ].join('\n'),
  );
  process.exit(1);
}

const app = criarApp();
const db = getDatabase();

const totalPrestadores = db.prepare('SELECT COUNT(*) AS total FROM prestadores').get().total;

const servidor = app.listen(config.port, () => {
  console.log('');
  console.log('  Patas Conectadas — API no ar');
  console.log(`  http://localhost:${config.port}/api/health`);
  console.log(`  ambiente: ${config.nodeEnv}`);
  console.log(`  banco:    ${config.databaseFile} (${totalPrestadores} profissionais)`);
  console.log(`  CORS:     ${config.corsOrigins.join(', ')}`);
  console.log('');
});

const encerrar = (sinal) => {
  console.log(`\n[${sinal}] encerrando a API...`);
  servidor.close(() => {
    closeDatabase();
    process.exit(0);
  });
};

process.on('SIGINT', () => encerrar('SIGINT'));
process.on('SIGTERM', () => encerrar('SIGTERM'));

export default servidor;
