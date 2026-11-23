import config from '../config/index.js';

/** Log simples de requisições (silencioso nos testes). */
export const requestLogger = (req, res, next) => {
  if (config.isTest) return next();

  const inicio = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - inicio) / 1_000_000;
    console.log(
      `${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms.toFixed(1)}ms)`,
    );
  });
  return next();
};

export default requestLogger;
