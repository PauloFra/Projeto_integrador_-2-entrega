import { getDatabase } from '../database/connection.js';

const mapear = (linha) =>
  linha
    ? {
        id: linha.id,
        nome: linha.nome,
        cnpj: linha.cnpj,
        bairro: linha.bairro,
        cidade: linha.cidade,
        telefone: linha.telefone,
        responsavelId: linha.responsavel_id,
      }
    : null;

export const clinicaRepository = {
  buscarPorId(id) {
    return mapear(getDatabase().prepare('SELECT * FROM clinicas WHERE id = ?').get(id));
  },

  buscarPorResponsavel(usuarioId) {
    return mapear(
      getDatabase().prepare('SELECT * FROM clinicas WHERE responsavel_id = ?').get(usuarioId),
    );
  },

  registrarEventoVerificacao({ prestadorId, atorId, acao, statusAnterior, statusNovo }) {
    getDatabase()
      .prepare(
        `INSERT INTO eventos_verificacao (prestador_id, ator_id, acao, status_anterior, status_novo)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(prestadorId, atorId, acao, statusAnterior, statusNovo);
  },

  listarEventosVerificacao(clinicaId, limite = 20) {
    return getDatabase()
      .prepare(
        `SELECT ev.*, u.nome AS ator_nome, up.nome AS prestador_nome
         FROM eventos_verificacao ev
         JOIN usuarios u       ON u.id  = ev.ator_id
         JOIN prestadores pr   ON pr.id = ev.prestador_id
         JOIN usuarios up      ON up.id = pr.usuario_id
         WHERE pr.clinica_id = ?
         ORDER BY ev.id DESC
         LIMIT ?`,
      )
      .all(clinicaId, limite)
      .map((linha) => ({
        id: linha.id,
        prestadorId: linha.prestador_id,
        prestadorNome: linha.prestador_nome,
        atorNome: linha.ator_nome,
        acao: linha.acao,
        statusAnterior: linha.status_anterior,
        statusNovo: linha.status_novo,
        criadoEm: linha.criado_em,
      }));
  },
};

export default clinicaRepository;
