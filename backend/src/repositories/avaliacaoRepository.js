import { getDatabase } from '../database/connection.js';

const mapear = (linha) => ({
  id: linha.id,
  agendamentoId: linha.agendamento_id,
  prestadorId: linha.prestador_id,
  autorId: linha.autor_id,
  autorNome: linha.autor_nome,
  nota: linha.nota,
  comentario: linha.comentario,
  criadoEm: linha.criado_em,
});

export const avaliacaoRepository = {
  criar({ agendamentoId, autorId, prestadorId, nota, comentario }) {
    const { lastInsertRowid } = getDatabase()
      .prepare(
        `INSERT INTO avaliacoes (agendamento_id, autor_id, prestador_id, nota, comentario)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(agendamentoId, autorId, prestadorId, nota, comentario ?? null);
    return this.buscarPorId(Number(lastInsertRowid));
  },

  buscarPorId(id) {
    const linha = getDatabase()
      .prepare(
        `SELECT av.*, u.nome AS autor_nome FROM avaliacoes av
         JOIN usuarios u ON u.id = av.autor_id WHERE av.id = ?`,
      )
      .get(id);
    return linha ? mapear(linha) : null;
  },

  buscarPorAgendamento(agendamentoId) {
    const linha = getDatabase()
      .prepare(
        `SELECT av.*, u.nome AS autor_nome FROM avaliacoes av
         JOIN usuarios u ON u.id = av.autor_id WHERE av.agendamento_id = ?`,
      )
      .get(agendamentoId);
    return linha ? mapear(linha) : null;
  },

  listarPorPrestador(prestadorId, limite = 10) {
    return getDatabase()
      .prepare(
        `SELECT av.*, u.nome AS autor_nome FROM avaliacoes av
         JOIN usuarios u ON u.id = av.autor_id
         WHERE av.prestador_id = ?
         ORDER BY av.criado_em DESC, av.id DESC
         LIMIT ?`,
      )
      .all(prestadorId, limite)
      .map(mapear);
  },

  mapear,
};

export default avaliacaoRepository;
