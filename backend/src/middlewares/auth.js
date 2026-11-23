import AppError from '../utils/AppError.js';
import authService from '../services/authService.js';

const extrairToken = (req) => {
  const header = req.headers.authorization ?? '';
  if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  return null;
};

/** Preenche req.usuario quando houver token válido, sem bloquear a requisição. */
export const autenticacaoOpcional = (req, _res, next) => {
  const token = extrairToken(req);
  req.usuario = token ? authService.usuarioDoToken(token) : null;
  next();
};

/** Exige um token válido. */
export const exigirAutenticacao = (req, _res, next) => {
  const token = extrairToken(req);
  const usuario = token ? authService.usuarioDoToken(token) : null;
  if (!usuario) {
    return next(AppError.unauthorized('Faça login para acessar este recurso.'));
  }
  req.usuario = usuario;
  return next();
};

/** Exige que o usuário autenticado tenha um dos papéis informados. */
export const exigirPapel = (...papeis) => (req, _res, next) => {
  if (!req.usuario) {
    return next(AppError.unauthorized('Faça login para acessar este recurso.'));
  }
  if (!papeis.includes(req.usuario.papel)) {
    return next(
      AppError.forbidden(`Recurso disponível apenas para: ${papeis.join(', ')}.`),
    );
  }
  return next();
};
