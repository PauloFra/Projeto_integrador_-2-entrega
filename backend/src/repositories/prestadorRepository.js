import { getDatabase } from '../database/connection.js';

const SELECT_BASE = `
  SELECT
    pr.id,
    pr.usuario_id,
    pr.nome_documento,
    pr.titulo,
    pr.especialidade,
    pr.bio,
    pr.preco_centavos,
    pr.duracao_minutos,
    pr.avaliacao_media,
    pr.avaliacoes_total,
    pr.disponivel_agora,
    pr.verificacao_status,
    pr.verificado_em,
    pr.documento,
    pr.clinica_id,
    u.nome        AS usuario_nome,
    u.email       AS usuario_email,
    u.telefone    AS usuario_telefone,
    u.bairro      AS usuario_bairro,
    u.cidade      AS usuario_cidade,
    u.latitude    AS usuario_latitude,
    u.longitude   AS usuario_longitude,
    u.avatar_url  AS usuario_avatar,
    s.slug        AS servico_slug,
    s.nome        AS servico_nome,
    s.icone       AS servico_icone
  FROM prestadores pr
  JOIN usuarios u ON u.id = pr.usuario_id
  JOIN servicos s ON s.id = pr.servico_id
`;

const mapear = (linha) =>
  linha
    ? {
        id: linha.id,
        usuarioId: linha.usuario_id,
        nome: linha.usuario_nome,
        nomeDocumento: linha.nome_documento,
        email: linha.usuario_email,
        telefone: linha.usuario_telefone,
        avatarUrl: linha.usuario_avatar,
        titulo: linha.titulo,
        especialidade: linha.especialidade,
        bio: linha.bio,
        precoCentavos: linha.preco_centavos,
        duracaoMinutos: linha.duracao_minutos,
        avaliacaoMedia: Number(Number(linha.avaliacao_media).toFixed(2)),
        avaliacoesTotal: linha.avaliacoes_total,
        disponivelAgora: Boolean(linha.disponivel_agora),
        verificacao: {
          status: linha.verificacao_status,
          verificadoEm: linha.verificado_em,
          documento: linha.documento,
        },
        clinicaId: linha.clinica_id,
        bairro: linha.usuario_bairro,
        cidade: linha.usuario_cidade,
        coordenada:
          typeof linha.usuario_latitude === 'number' && typeof linha.usuario_longitude === 'number'
            ? { lat: linha.usuario_latitude, lng: linha.usuario_longitude }
            : null,
        servico: {
          slug: linha.servico_slug,
          nome: linha.servico_nome,
          icone: linha.servico_icone,
        },
      }
    : null;

export const prestadorRepository = {
  /**
   * Busca prestadores com filtros aplicados no banco.
   * Os filtros que dependem de distância são resolvidos na camada de serviço,
   * porque o cálculo de Haversine acontece em JavaScript.
   */
  listar({ servicoSlug, disponivelAgora, notaMinima, precoMaximoCentavos, termo, apenasVerificados } = {}) {
    const condicoes = [];
    const parametros = {};

    if (servicoSlug) {
      condicoes.push('s.slug = @servicoSlug');
      parametros.servicoSlug = servicoSlug;
    }
    if (disponivelAgora === true) {
      condicoes.push('pr.disponivel_agora = 1');
    }
    if (typeof notaMinima === 'number') {
      condicoes.push('pr.avaliacao_media >= @notaMinima');
      parametros.notaMinima = notaMinima;
    }
    if (typeof precoMaximoCentavos === 'number') {
      condicoes.push('pr.preco_centavos <= @precoMaximoCentavos');
      parametros.precoMaximoCentavos = precoMaximoCentavos;
    }
    if (apenasVerificados) {
      condicoes.push("pr.verificacao_status = 'verificado'");
    }
    if (termo) {
      condicoes.push('(u.nome LIKE @termo OR pr.especialidade LIKE @termo OR pr.titulo LIKE @termo)');
      parametros.termo = `%${termo}%`;
    }

    const where = condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '';
    const sql = `${SELECT_BASE} ${where} ORDER BY pr.avaliacao_media DESC, pr.avaliacoes_total DESC`;
    return getDatabase().prepare(sql).all(parametros).map(mapear);
  },

  buscarPorId(id) {
    return mapear(getDatabase().prepare(`${SELECT_BASE} WHERE pr.id = ?`).get(id));
  },

  buscarPorUsuarioId(usuarioId) {
    return mapear(getDatabase().prepare(`${SELECT_BASE} WHERE pr.usuario_id = ?`).get(usuarioId));
  },

  listarPorClinica(clinicaId) {
    return getDatabase()
      .prepare(`${SELECT_BASE} WHERE pr.clinica_id = ? ORDER BY s.ordem, pr.avaliacao_media DESC, u.nome`)
      .all(clinicaId)
      .map(mapear);
  },

  atualizarDisponibilidade(id, disponivel) {
    getDatabase()
      .prepare('UPDATE prestadores SET disponivel_agora = ? WHERE id = ?')
      .run(disponivel ? 1 : 0, id);
    return this.buscarPorId(id);
  },

  atualizarVerificacao(id, status, verificadoEm) {
    getDatabase()
      .prepare('UPDATE prestadores SET verificacao_status = ?, verificado_em = ? WHERE id = ?')
      .run(status, verificadoEm, id);
    return this.buscarPorId(id);
  },

  atualizarResumoAvaliacoes(id, media, total) {
    getDatabase()
      .prepare('UPDATE prestadores SET avaliacao_media = ?, avaliacoes_total = ? WHERE id = ?')
      .run(media, total, id);
    return this.buscarPorId(id);
  },

  mapear,
};

export default prestadorRepository;
