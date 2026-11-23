import crypto from 'node:crypto';
import config from '../config/index.js';

const SCRYPT_KEYLEN = 64;

/**
 * Gera o hash de uma senha com scrypt + salt aleatório.
 * Formato armazenado: "scrypt$<salt-hex>$<hash-hex>".
 * Usa apenas o módulo nativo node:crypto — sem dependência externa.
 */
export const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `scrypt$${salt}$${hash}`;
};

/** Compara a senha informada com o hash armazenado, em tempo constante. */
export const verifyPassword = (password, stored) => {
  if (typeof stored !== 'string') return false;
  const [algoritmo, salt, hash] = stored.split('$');
  if (algoritmo !== 'scrypt' || !salt || !hash) return false;

  const candidato = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  const esperado = Buffer.from(hash, 'hex');
  if (candidato.length !== esperado.length) return false;
  return crypto.timingSafeEqual(candidato, esperado);
};

const base64url = (value) => Buffer.from(value, 'utf8').toString('base64url');
const fromBase64url = (value) => Buffer.from(value, 'base64url').toString('utf8');

const sign = (payloadEncoded) =>
  crypto.createHmac('sha256', config.auth.secret).update(payloadEncoded).digest('base64url');

/**
 * Emite um token de sessão assinado com HMAC-SHA256.
 * Estrutura: "<payload-base64url>.<assinatura-base64url>".
 */
export const createToken = (payload, ttlHours = config.auth.tokenTtlHours) => {
  const corpo = {
    ...payload,
    iat: Date.now(),
    exp: Date.now() + ttlHours * 60 * 60 * 1000,
  };
  const payloadEncoded = base64url(JSON.stringify(corpo));
  return `${payloadEncoded}.${sign(payloadEncoded)}`;
};

/**
 * Valida assinatura e expiração de um token.
 * @returns {object|null} payload decodificado ou null se inválido/expirado
 */
export const readToken = (token) => {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [payloadEncoded, assinatura] = token.split('.');
  if (!payloadEncoded || !assinatura) return null;

  const esperada = Buffer.from(sign(payloadEncoded), 'utf8');
  const recebida = Buffer.from(assinatura, 'utf8');
  if (esperada.length !== recebida.length) return null;
  if (!crypto.timingSafeEqual(esperada, recebida)) return null;

  try {
    const payload = JSON.parse(fromBase64url(payloadEncoded));
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
};

/** Código curto e legível para identificar um agendamento (ex.: "PC-7K3QD2"). */
export const gerarCodigo = (prefixo = 'PC') => {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let sufixo = '';
  for (let i = 0; i < 6; i += 1) {
    sufixo += alfabeto[crypto.randomInt(0, alfabeto.length)];
  }
  return `${prefixo}-${sufixo}`;
};
