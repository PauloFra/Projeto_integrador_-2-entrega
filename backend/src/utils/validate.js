import AppError from './AppError.js';

/**
 * Validação de payload sem dependências externas.
 * Cada regra recebe o valor e devolve uma mensagem de erro ou null.
 */
export const rules = {
  required: (label) => (value) =>
    value === undefined || value === null || value === ''
      ? `${label} é obrigatório.`
      : null,

  string: (label, { min = 1, max = 2000 } = {}) => (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string') return `${label} deve ser um texto.`;
    const trimmed = value.trim();
    if (trimmed.length < min) return `${label} deve ter ao menos ${min} caractere(s).`;
    if (trimmed.length > max) return `${label} deve ter no máximo ${max} caractere(s).`;
    return null;
  },

  integer: (label, { min = -Infinity, max = Infinity } = {}) => (value) => {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) return `${label} deve ser um número inteiro.`;
    if (parsed < min) return `${label} deve ser maior ou igual a ${min}.`;
    if (parsed > max) return `${label} deve ser menor ou igual a ${max}.`;
    return null;
  },

  number: (label, { min = -Infinity, max = Infinity } = {}) => (value) => {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return `${label} deve ser um número.`;
    if (parsed < min) return `${label} deve ser maior ou igual a ${min}.`;
    if (parsed > max) return `${label} deve ser menor ou igual a ${max}.`;
    return null;
  },

  oneOf: (label, allowed) => (value) => {
    if (value === undefined || value === null || value === '') return null;
    return allowed.includes(value)
      ? null
      : `${label} deve ser um destes valores: ${allowed.join(', ')}.`;
  },

  isoDateTime: (label) => (value) => {
    if (value === undefined || value === null || value === '') return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? `${label} deve ser uma data/hora válida em formato ISO (ex.: 2026-11-25T10:00:00).`
      : null;
  },
};

/**
 * Executa um mapa { campo: [regras] } contra o payload recebido.
 * Lança AppError 400 com a lista completa dos problemas encontrados.
 */
export const validate = (payload = {}, schema = {}) => {
  const errors = {};
  for (const [field, fieldRules] of Object.entries(schema)) {
    for (const rule of fieldRules) {
      const message = rule(payload[field]);
      if (message) {
        errors[field] = message;
        break;
      }
    }
  }
  if (Object.keys(errors).length > 0) {
    throw AppError.badRequest('Dados inválidos na requisição.', errors);
  }
  return payload;
};

export default validate;
