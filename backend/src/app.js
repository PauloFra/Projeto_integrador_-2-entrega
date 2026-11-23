import express from 'express';
import cors from 'cors';
import config from './config/index.js';
import rotas from './routes/index.js';
import requestLogger from './middlewares/requestLogger.js';
import { errorHandler, rotaNaoEncontrada } from './middlewares/errorHandler.js';

/**
 * Monta a aplicação Express.
 * Fica separada do server.js para que os testes possam usar a app
 * sem abrir uma porta fixa.
 */
export const criarApp = () => {
  const app = express();

  app.use(
    cors({
      origin: (origem, callback) => {
        // Requisições sem Origin (curl, testes, mesma origem) são liberadas.
        if (!origem || config.corsOrigins.includes(origem)) return callback(null, true);
        return callback(new Error(`Origem não permitida pelo CORS: ${origem}`));
      },
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(requestLogger);

  app.get('/', (_req, res) => {
    res.json({
      nome: 'Patas Conectadas — API da PoC',
      versao: '1.0.0',
      documentacao: '/api/health e docs/api.md no repositório',
      rotas: '/api',
    });
  });

  app.use('/api', rotas);

  app.use(rotaNaoEncontrada);
  app.use(errorHandler);

  return app;
};

export default criarApp;
