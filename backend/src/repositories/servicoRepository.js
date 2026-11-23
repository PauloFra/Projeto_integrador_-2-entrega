import { getDatabase } from '../database/connection.js';

const mapear = (linha) => ({
  id: linha.id,
  slug: linha.slug,
  nome: linha.nome,
  descricao: linha.descricao,
  icone: linha.icone,
  totalPrestadores: linha.total_prestadores ?? undefined,
});

export const servicoRepository = {
  listar() {
    return getDatabase()
      .prepare(
        `SELECT s.*,
                (SELECT COUNT(*) FROM prestadores pr WHERE pr.servico_id = s.id) AS total_prestadores
         FROM servicos s
         ORDER BY s.ordem, s.nome`,
      )
      .all()
      .map(mapear);
  },

  buscarPorSlug(slug) {
    const linha = getDatabase().prepare('SELECT * FROM servicos WHERE slug = ?').get(slug);
    return linha ? mapear(linha) : null;
  },

  buscarPorId(id) {
    const linha = getDatabase().prepare('SELECT * FROM servicos WHERE id = ?').get(id);
    return linha ? mapear(linha) : null;
  },
};

export default servicoRepository;
