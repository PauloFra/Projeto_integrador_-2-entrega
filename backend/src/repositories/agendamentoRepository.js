import { getDatabase } from '../database/connection.js';

const SELECT_BASE = `
  SELECT
    a.*,
    p.nome        AS pet_nome,
    p.raca        AS pet_raca,
    p.porte       AS pet_porte,
    p.foto_url    AS pet_foto,
    t.nome        AS tutor_nome,
    t.telefone    AS tutor_telefone,
    pr.titulo     AS prestador_titulo,
    pr.especialidade AS prestador_especialidade,
    pr.avaliacao_media AS prestador_avaliacao,
    pr.usuario_id AS prestador_usuario_id,
    up.nome       AS prestador_nome,
    up.avatar_url AS prestador_avatar,
    up.telefone   AS prestador_telefone,
    s.slug        AS servico_slug,
    s.nome        AS servico_nome,
    av.nota       AS avaliacao_nota,
    av.comentario AS avaliacao_comentario,
    cv.id         AS conversa_id
  FROM agendamentos a
  JOIN pets p         ON p.id  = a.pet_id
  JOIN usuarios t     ON t.id  = a.tutor_id
  JOIN prestadores pr ON pr.id = a.prestador_id
  JOIN usuarios up    ON up.id = pr.usuario_id
  JOIN servicos s     ON s.id  = a.servico_id
  LEFT JOIN avaliacoes av ON av.agendamento_id = a.id
  LEFT JOIN conversas cv  ON cv.agendamento_id = a.id
`;

const mapear = (linha) =>
  linha
    ? {
        id: linha.id,
        codigo: linha.codigo,
        titulo: linha.titulo,
        inicioEm: linha.inicio_em,
        duracaoMinutos: linha.duracao_minutos,
        valorCentavos: linha.valor_centavos,
        status: linha.status,
        localEncontro: linha.local_encontro,
        observacoes: linha.observacoes,
        concluidoEm: linha.concluido_em,
        canceladoMotivo: linha.cancelado_motivo,
        criadoEm: linha.criado_em,
        atualizadoEm: linha.atualizado_em,
        pet: {
          id: linha.pet_id,
          nome: linha.pet_nome,
          raca: linha.pet_raca,
          porte: linha.pet_porte,
          fotoUrl: linha.pet_foto,
        },
        tutor: {
          id: linha.tutor_id,
          nome: linha.tutor_nome,
          telefone: linha.tutor_telefone,
        },
        prestador: {
          id: linha.prestador_id,
          usuarioId: linha.prestador_usuario_id,
          nome: linha.prestador_nome,
          titulo: linha.prestador_titulo,
          especialidade: linha.prestador_especialidade,
          avatarUrl: linha.prestador_avatar,
          telefone: linha.prestador_telefone,
          avaliacaoMedia: linha.prestador_avaliacao,
        },
        servico: {
          slug: linha.servico_slug,
          nome: linha.servico_nome,
        },
        avaliacao:
          linha.avaliacao_nota === null || linha.avaliacao_nota === undefined
            ? null
            : { nota: linha.avaliacao_nota, comentario: linha.avaliacao_comentario },
        conversaId: linha.conversa_id ?? null,
      }
    : null;

const STATUS_ATIVOS = ['solicitado', 'confirmado', 'em_andamento'];

export const agendamentoRepository = {
  criar(dados) {
    const { lastInsertRowid } = getDatabase()
      .prepare(
        `INSERT INTO agendamentos (codigo, tutor_id, pet_id, prestador_id, servico_id, titulo,
                                   inicio_em, duracao_minutos, valor_centavos, status,
                                   local_encontro, observacoes)
         VALUES (@codigo, @tutorId, @petId, @prestadorId, @servicoId, @titulo,
                 @inicioEm, @duracaoMinutos, @valorCentavos, @status,
                 @localEncontro, @observacoes)`,
      )
      .run({ status: 'solicitado', localEncontro: null, observacoes: null, ...dados });
    return this.buscarPorId(Number(lastInsertRowid));
  },

  buscarPorId(id) {
    return mapear(getDatabase().prepare(`${SELECT_BASE} WHERE a.id = ?`).get(id));
  },

  listarPorTutor(tutorId, { status, petId } = {}) {
    const condicoes = ['a.tutor_id = @tutorId'];
    const parametros = { tutorId };

    if (status === 'ativos') {
      condicoes.push(`a.status IN ('${STATUS_ATIVOS.join("', '")}')`);
    } else if (status) {
      condicoes.push('a.status = @status');
      parametros.status = status;
    }
    if (petId) {
      condicoes.push('a.pet_id = @petId');
      parametros.petId = petId;
    }

    return getDatabase()
      .prepare(`${SELECT_BASE} WHERE ${condicoes.join(' AND ')} ORDER BY a.inicio_em DESC`)
      .all(parametros)
      .map(mapear);
  },

  listarPorPrestador(prestadorId, { status, apartirDe } = {}) {
    const condicoes = ['a.prestador_id = @prestadorId'];
    const parametros = { prestadorId };

    if (status === 'ativos') {
      condicoes.push(`a.status IN ('${STATUS_ATIVOS.join("', '")}')`);
    } else if (status) {
      condicoes.push('a.status = @status');
      parametros.status = status;
    }
    if (apartirDe) {
      condicoes.push('a.inicio_em >= @apartirDe');
      parametros.apartirDe = apartirDe;
    }

    const ordem = apartirDe ? 'ASC' : 'DESC';
    return getDatabase()
      .prepare(`${SELECT_BASE} WHERE ${condicoes.join(' AND ')} ORDER BY a.inicio_em ${ordem}`)
      .all(parametros)
      .map(mapear);
  },

  listarPorPet(petId) {
    return getDatabase()
      .prepare(`${SELECT_BASE} WHERE a.pet_id = ? ORDER BY a.inicio_em DESC`)
      .all(petId)
      .map(mapear);
  },

  atualizarStatus(id, status, extras = {}) {
    getDatabase()
      .prepare(
        `UPDATE agendamentos
         SET status = @status,
             concluido_em = COALESCE(@concluidoEm, concluido_em),
             cancelado_motivo = COALESCE(@canceladoMotivo, cancelado_motivo),
             atualizado_em = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
         WHERE id = @id`,
      )
      .run({
        id,
        status,
        concluidoEm: extras.concluidoEm ?? null,
        canceladoMotivo: extras.canceladoMotivo ?? null,
      });
    return this.buscarPorId(id);
  },

  /** Indicadores do mês corrente para a agenda do prestador. */
  estatisticasDoPrestador(prestadorId, mesIso) {
    const db = getDatabase();
    const naAgenda = db
      .prepare(
        `SELECT COUNT(*) AS total FROM agendamentos
         WHERE prestador_id = ? AND status IN ('solicitado', 'confirmado', 'em_andamento')`,
      )
      .get(prestadorId).total;

    const mes = db
      .prepare(
        `SELECT COUNT(*) AS total, COALESCE(SUM(valor_centavos), 0) AS valor
         FROM agendamentos
         WHERE prestador_id = ? AND status = 'concluido' AND substr(inicio_em, 1, 7) = ?`,
      )
      .get(prestadorId, mesIso);

    return {
      naAgenda,
      concluidosNoMes: mes.total,
      recebidoNoMesCentavos: mes.valor,
    };
  },

  /** Indicadores agregados usados no painel da clínica. */
  estatisticasDaRede(clinicaId, mesIso) {
    const db = getDatabase();
    const servicos = db
      .prepare(
        `SELECT COUNT(*) AS total FROM agendamentos a
         JOIN prestadores pr ON pr.id = a.prestador_id
         WHERE pr.clinica_id = ? AND substr(a.inicio_em, 1, 7) = ? AND a.status <> 'cancelado'`,
      )
      .get(clinicaId, mesIso).total;

    const pets = db
      .prepare(
        `SELECT COUNT(DISTINCT a.pet_id) AS total FROM agendamentos a
         JOIN prestadores pr ON pr.id = a.prestador_id
         WHERE pr.clinica_id = ? AND substr(a.inicio_em, 1, 7) = ? AND a.status <> 'cancelado'`,
      )
      .get(clinicaId, mesIso).total;

    return { servicosNoMes: servicos, petsAcompanhados: pets };
  },

  mapear,
  STATUS_ATIVOS,
};

export default agendamentoRepository;
