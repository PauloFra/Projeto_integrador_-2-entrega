import { getDatabase } from '../database/connection.js';

const mapear = (linha) =>
  linha
    ? {
        id: linha.id,
        nome: linha.nome,
        email: linha.email,
        papel: linha.papel,
        telefone: linha.telefone,
        bairro: linha.bairro,
        cidade: linha.cidade,
        coordenada:
          typeof linha.latitude === 'number' && typeof linha.longitude === 'number'
            ? { lat: linha.latitude, lng: linha.longitude }
            : null,
        avatarUrl: linha.avatar_url,
        criadoEm: linha.criado_em,
      }
    : null;

export const usuarioRepository = {
  /** Linha crua (inclui senha_hash) — usada apenas na autenticação. */
  buscarLinhaPorEmail(email) {
    return getDatabase()
      .prepare('SELECT * FROM usuarios WHERE email = ? COLLATE NOCASE')
      .get(email);
  },

  buscarPorId(id) {
    return mapear(getDatabase().prepare('SELECT * FROM usuarios WHERE id = ?').get(id));
  },

  listarPorPapel(papel) {
    return getDatabase()
      .prepare('SELECT * FROM usuarios WHERE papel = ? ORDER BY nome')
      .all(papel)
      .map(mapear);
  },

  mapear,
};

export default usuarioRepository;
