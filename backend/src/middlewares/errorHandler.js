import config from '../config/index.js';
import AppError from '../utils/AppError.js';

/** Rota inexistente — resposta 404 padronizada. */
export const rotaNaoEncontrada = (req, _res, next) => {
  next(AppError.notFound(`Rota não encontrada: ${req.method} ${req.originalUrl}`));
};

/**
 * Tradutor final de erros: AppError vira resposta com o status declarado,
 * qualquer outro erro vira 500 (com stack apenas fora de produção).
 */
export const errorHandler = (erro, _req, res, _next) => {
  const status = erro instanceof AppError ? erro.status : erro.status ?? 500;

  if (status >= 500 && !config.isTest) {
    console.error('[erro]', erro);
  }

  const corpo = {
    erro: status >= 500 ? 'Erro interno no servidor.' : erro.message,
  };
  if (erro.details) corpo.detalhes = erro.details;
  if (!config.isProduction && status >= 500) corpo.stack = erro.stack;

  res.status(status).json(corpo);
};

export default errorHandler;
