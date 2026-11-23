/**
 * Erro de aplicação com status HTTP associado.
 * É lançado pelas camadas de serviço e traduzido para JSON pelo errorHandler.
 */
export class AppError extends Error {
  constructor(message, status = 400, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.details = details;
  }

  static badRequest(message, details) {
    return new AppError(message, 400, details);
  }

  static unauthorized(message = 'Credenciais inválidas ou sessão expirada.') {
    return new AppError(message, 401);
  }

  static forbidden(message = 'Você não tem permissão para esta ação.') {
    return new AppError(message, 403);
  }

  static notFound(message = 'Recurso não encontrado.') {
    return new AppError(message, 404);
  }

  static conflict(message, details) {
    return new AppError(message, 409, details);
  }
}

export default AppError;
