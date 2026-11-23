import { getDatabase } from '../database/connection.js';

const SELECT_CONVERSA = `
  SELECT
    cv.*,
    a.titulo        AS agendamento_titulo,
    a.inicio_em     AS agendamento_inicio,
    a.status        AS agendamento_status,
    a.codigo        AS agendamento_codigo,
    p.nome          AS pet_nome,
    p.foto_url      AS pet_foto,
    t.nome          AS tutor_nome,
    pr.usuario_id   AS prestador_usuario_id,
    pr.titulo       AS prestador_titulo,
    up.nome         AS prestador_nome,
    up.avatar_url   AS prestador_avatar,
    (SELECT conteudo FROM mensagens m WHERE m.conversa_id = cv.id ORDER BY m.id DESC LIMIT 1) AS ultima_mensagem,
    (SELECT enviado_em FROM mensagens m WHERE m.conversa_id = cv.id ORDER BY m.id DESC LIMIT 1) AS ultima_mensagem_em
  FROM conversas cv
  JOIN agendamentos a  ON a.id  = cv.agendamento_id
  JOIN pets p          ON p.id  = a.pet_id
  JOIN usuarios t      ON t.id  = cv.tutor_id
  JOIN prestadores pr  ON pr.id = cv.prestador_id
  JOIN usuarios up     ON up.id = pr.usuario_id
`;

const mapearConversa = (usuarioId) => (linha) => ({
  id: linha.id,
  agendamento: {
    id: linha.agendamento_id,
    codigo: linha.agendamento_codigo,
    titulo: linha.agendamento_titulo,
    inicioEm: linha.agendamento_inicio,
    status: linha.agendamento_status,
  },
  pet: { nome: linha.pet_nome, fotoUrl: linha.pet_foto },
  tutor: { id: linha.tutor_id, nome: linha.tutor_nome },
  prestador: {
    id: linha.prestador_id,
    usuarioId: linha.prestador_usuario_id,
    nome: linha.prestador_nome,
    titulo: linha.prestador_titulo,
    avatarUrl: linha.prestador_avatar,
  },
  // nome e avatar de quem está do "outro lado" da conversa
  contraparte:
    usuarioId === linha.tutor_id
      ? { nome: linha.prestador_nome, papel: 'prestador', avatarUrl: linha.prestador_avatar }
      : { nome: linha.tutor_nome, papel: 'tutor', avatarUrl: null },
  ultimaMensagem: linha.ultima_mensagem,
  ultimaMensagemEm: linha.ultima_mensagem_em,
  naoLidas: linha.nao_lidas ?? 0,
  criadoEm: linha.criado_em,
  atualizadoEm: linha.atualizado_em,
});

const mapearMensagem = (linha) => ({
  id: linha.id,
  conversaId: linha.conversa_id,
  autorId: linha.autor_id,
  autorNome: linha.autor_nome,
  conteudo: linha.conteudo,
  lida: Boolean(linha.lida),
  enviadoEm: linha.enviado_em,
});

export const conversaRepository = {
  criar({ agendamentoId, tutorId, prestadorId }) {
    const { lastInsertRowid } = getDatabase()
      .prepare('INSERT INTO conversas (agendamento_id, tutor_id, prestador_id) VALUES (?, ?, ?)')
      .run(agendamentoId, tutorId, prestadorId);
    return Number(lastInsertRowid);
  },

  buscarPorId(id, usuarioId) {
    const linha = getDatabase().prepare(`${SELECT_CONVERSA} WHERE cv.id = ?`).get(id);
    return linha ? mapearConversa(usuarioId)(linha) : null;
  },

  buscarPorAgendamento(agendamentoId, usuarioId) {
    const linha = getDatabase()
      .prepare(`${SELECT_CONVERSA} WHERE cv.agendamento_id = ?`)
      .get(agendamentoId);
    return linha ? mapearConversa(usuarioId)(linha) : null;
  },

  /**
   * Conversas visíveis para um usuário: as dele como tutor e,
   * se for prestador, as dos atendimentos dele.
   */
  listarPorUsuario(usuarioId) {
    const db = getDatabase();
    const linhas = db
      .prepare(
        `${SELECT_CONVERSA}
         WHERE cv.tutor_id = @usuarioId OR pr.usuario_id = @usuarioId
         ORDER BY COALESCE(ultima_mensagem_em, cv.criado_em) DESC`,
      )
      .all({ usuarioId });

    const contarNaoLidas = db.prepare(
      'SELECT COUNT(*) AS total FROM mensagens WHERE conversa_id = ? AND autor_id <> ? AND lida = 0',
    );

    return linhas.map((linha) =>
      mapearConversa(usuarioId)({
        ...linha,
        nao_lidas: contarNaoLidas.get(linha.id, usuarioId).total,
      }),
    );
  },

  listarMensagens(conversaId) {
    return getDatabase()
      .prepare(
        `SELECT m.*, u.nome AS autor_nome FROM mensagens m
         JOIN usuarios u ON u.id = m.autor_id
         WHERE m.conversa_id = ?
         ORDER BY m.id`,
      )
      .all(conversaId)
      .map(mapearMensagem);
  },

  criarMensagem({ conversaId, autorId, conteudo }) {
    const db = getDatabase();
    const { lastInsertRowid } = db
      .prepare('INSERT INTO mensagens (conversa_id, autor_id, conteudo) VALUES (?, ?, ?)')
      .run(conversaId, autorId, conteudo);
    db.prepare(
      "UPDATE conversas SET atualizado_em = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?",
    ).run(conversaId);

    const linha = db
      .prepare(
        `SELECT m.*, u.nome AS autor_nome FROM mensagens m
         JOIN usuarios u ON u.id = m.autor_id WHERE m.id = ?`,
      )
      .get(Number(lastInsertRowid));
    return mapearMensagem(linha);
  },

  marcarComoLidas(conversaId, usuarioId) {
    return getDatabase()
      .prepare('UPDATE mensagens SET lida = 1 WHERE conversa_id = ? AND autor_id <> ?')
      .run(conversaId, usuarioId).changes;
  },
};

export default conversaRepository;
