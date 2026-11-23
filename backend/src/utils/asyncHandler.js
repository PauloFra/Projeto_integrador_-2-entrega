/**
 * Envolve um handler assíncrono do Express e encaminha rejeições para o
 * middleware de erro, evitando try/catch repetido em todos os controllers.
 */
export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

export default asyncHandler;
