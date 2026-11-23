-- ===========================================================================
-- Patas Conectadas — esquema do repositório de dados (SQLite)
--
-- Convenções:
--   * nomes de tabelas e colunas em português, snake_case;
--   * datas/horas de agendamento em ISO local sem fuso ("2026-11-25T10:00:00");
--   * timestamps de auditoria em ISO UTC ("2026-11-23T14:05:00Z");
--   * valores monetários em centavos (INTEGER) para evitar erro de ponto flutuante;
--   * booleanos como INTEGER 0/1 (SQLite não possui tipo booleano).
-- ===========================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Usuários: tutores, prestadores de serviço e gestores de clínica
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  nome             TEXT    NOT NULL,
  email            TEXT    NOT NULL UNIQUE,
  senha_hash       TEXT    NOT NULL,
  papel            TEXT    NOT NULL CHECK (papel IN ('tutor', 'prestador', 'clinica')),
  telefone         TEXT,
  bairro           TEXT,
  cidade           TEXT,
  latitude         REAL,
  longitude        REAL,
  avatar_url       TEXT,
  criado_em        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_usuarios_papel ON usuarios (papel);

-- ---------------------------------------------------------------------------
-- Catálogo de serviços oferecidos na plataforma
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS servicos (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  slug             TEXT    NOT NULL UNIQUE,
  nome             TEXT    NOT NULL,
  descricao        TEXT,
  icone            TEXT,
  ordem            INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- Clínicas parceiras (área de gestão)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinicas (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  nome               TEXT    NOT NULL,
  cnpj               TEXT,
  bairro             TEXT,
  cidade             TEXT,
  latitude           REAL,
  longitude          REAL,
  telefone           TEXT,
  responsavel_id     INTEGER REFERENCES usuarios (id) ON DELETE SET NULL,
  criado_em          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ---------------------------------------------------------------------------
-- Prestadores: perfil profissional vinculado a um usuário
-- avaliacao_media / avaliacoes_total são denormalizações mantidas pela
-- camada de serviço a cada nova avaliação (leitura barata na busca).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prestadores (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id           INTEGER NOT NULL UNIQUE REFERENCES usuarios (id) ON DELETE CASCADE,
  servico_id           INTEGER NOT NULL REFERENCES servicos (id),
  nome_documento       TEXT,
  titulo               TEXT    NOT NULL,
  especialidade        TEXT,
  bio                  TEXT,
  preco_centavos       INTEGER NOT NULL CHECK (preco_centavos >= 0),
  duracao_minutos      INTEGER NOT NULL DEFAULT 30 CHECK (duracao_minutos > 0),
  avaliacao_media      REAL    NOT NULL DEFAULT 0 CHECK (avaliacao_media >= 0 AND avaliacao_media <= 5),
  avaliacoes_total     INTEGER NOT NULL DEFAULT 0 CHECK (avaliacoes_total >= 0),
  disponivel_agora     INTEGER NOT NULL DEFAULT 1 CHECK (disponivel_agora IN (0, 1)),
  verificacao_status   TEXT    NOT NULL DEFAULT 'pendente'
                               CHECK (verificacao_status IN ('pendente', 'verificado', 'revogado')),
  verificado_em        TEXT,
  documento            TEXT,
  clinica_id           INTEGER REFERENCES clinicas (id) ON DELETE SET NULL,
  criado_em            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_prestadores_servico ON prestadores (servico_id);
CREATE INDEX IF NOT EXISTS idx_prestadores_clinica ON prestadores (clinica_id);
CREATE INDEX IF NOT EXISTS idx_prestadores_verificacao ON prestadores (verificacao_status);

-- ---------------------------------------------------------------------------
-- Pets dos tutores
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pets (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  tutor_id         INTEGER NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  nome             TEXT    NOT NULL,
  especie          TEXT    NOT NULL DEFAULT 'cachorro',
  raca             TEXT,
  sexo             TEXT    CHECK (sexo IN ('femea', 'macho')),
  idade_anos       INTEGER CHECK (idade_anos >= 0),
  peso_kg          REAL    CHECK (peso_kg > 0),
  porte            TEXT    CHECK (porte IN ('pequeno', 'medio', 'grande')),
  castrado         INTEGER NOT NULL DEFAULT 0 CHECK (castrado IN (0, 1)),
  microchipado     INTEGER NOT NULL DEFAULT 0 CHECK (microchipado IN (0, 1)),
  sociavel         INTEGER NOT NULL DEFAULT 1 CHECK (sociavel IN (0, 1)),
  sobre            TEXT,
  foto_url         TEXT,
  criado_em        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_pets_tutor ON pets (tutor_id);

-- ---------------------------------------------------------------------------
-- Carteira de saúde: vacinas, vermífugos, antipulgas e exames
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS registros_saude (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id           INTEGER NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  tipo             TEXT    NOT NULL CHECK (tipo IN ('vacina', 'vermifugo', 'antipulgas', 'exame', 'consulta')),
  nome             TEXT    NOT NULL,
  aplicado_em      TEXT    NOT NULL,
  proxima_dose     TEXT,
  status           TEXT    NOT NULL DEFAULT 'em_dia' CHECK (status IN ('em_dia', 'protegida', 'atrasado')),
  observacao       TEXT,
  criado_em        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_registros_saude_pet ON registros_saude (pet_id);

-- ---------------------------------------------------------------------------
-- Observações veterinárias registradas por uma clínica
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notas_veterinarias (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id             INTEGER NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  clinica_id         INTEGER REFERENCES clinicas (id) ON DELETE SET NULL,
  veterinario_nome   TEXT    NOT NULL,
  crmv               TEXT,
  conteudo           TEXT    NOT NULL,
  registrado_em      TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notas_veterinarias_pet ON notas_veterinarias (pet_id);

-- ---------------------------------------------------------------------------
-- Agendamentos (passeios, pet sitter, banho e tosa, veterinário)
-- Ciclo de vida do status:
--   solicitado -> confirmado -> em_andamento -> concluido
--   solicitado/confirmado -> cancelado
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agendamentos (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo             TEXT    NOT NULL UNIQUE,
  tutor_id           INTEGER NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  pet_id             INTEGER NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  prestador_id       INTEGER NOT NULL REFERENCES prestadores (id) ON DELETE CASCADE,
  servico_id         INTEGER NOT NULL REFERENCES servicos (id),
  titulo             TEXT    NOT NULL,
  inicio_em          TEXT    NOT NULL,
  duracao_minutos    INTEGER NOT NULL CHECK (duracao_minutos > 0),
  valor_centavos     INTEGER NOT NULL CHECK (valor_centavos >= 0),
  status             TEXT    NOT NULL DEFAULT 'solicitado'
                             CHECK (status IN ('solicitado', 'confirmado', 'em_andamento', 'concluido', 'cancelado')),
  local_encontro     TEXT,
  observacoes        TEXT,
  concluido_em       TEXT,
  cancelado_motivo   TEXT,
  criado_em          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  atualizado_em      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_agendamentos_tutor ON agendamentos (tutor_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_prestador ON agendamentos (prestador_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON agendamentos (status);
CREATE INDEX IF NOT EXISTS idx_agendamentos_inicio ON agendamentos (inicio_em);

-- ---------------------------------------------------------------------------
-- Avaliações: uma por agendamento concluído
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS avaliacoes (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  agendamento_id     INTEGER NOT NULL UNIQUE REFERENCES agendamentos (id) ON DELETE CASCADE,
  autor_id           INTEGER NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  prestador_id       INTEGER NOT NULL REFERENCES prestadores (id) ON DELETE CASCADE,
  nota               INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario         TEXT,
  criado_em          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_avaliacoes_prestador ON avaliacoes (prestador_id);

-- ---------------------------------------------------------------------------
-- Conversas: abertas automaticamente quando um agendamento é criado
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversas (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  agendamento_id     INTEGER NOT NULL UNIQUE REFERENCES agendamentos (id) ON DELETE CASCADE,
  tutor_id           INTEGER NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  prestador_id       INTEGER NOT NULL REFERENCES prestadores (id) ON DELETE CASCADE,
  criado_em          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  atualizado_em      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_conversas_tutor ON conversas (tutor_id);
CREATE INDEX IF NOT EXISTS idx_conversas_prestador ON conversas (prestador_id);

CREATE TABLE IF NOT EXISTS mensagens (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  conversa_id        INTEGER NOT NULL REFERENCES conversas (id) ON DELETE CASCADE,
  autor_id           INTEGER NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  conteudo           TEXT    NOT NULL,
  lida               INTEGER NOT NULL DEFAULT 0 CHECK (lida IN (0, 1)),
  enviado_em         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_mensagens_conversa ON mensagens (conversa_id);

-- ---------------------------------------------------------------------------
-- Consultas na clínica (agenda veterinária do pet)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consultas_clinica (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id             INTEGER NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  clinica_id         INTEGER NOT NULL REFERENCES clinicas (id) ON DELETE CASCADE,
  titulo             TEXT    NOT NULL,
  inicio_em          TEXT    NOT NULL,
  veterinario_nome   TEXT,
  status             TEXT    NOT NULL DEFAULT 'confirmada'
                             CHECK (status IN ('confirmada', 'realizada', 'cancelada')),
  observacao         TEXT
);

CREATE INDEX IF NOT EXISTS idx_consultas_pet ON consultas_clinica (pet_id);

-- ---------------------------------------------------------------------------
-- Trilha de auditoria das ações de verificação feitas pela clínica
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS eventos_verificacao (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  prestador_id       INTEGER NOT NULL REFERENCES prestadores (id) ON DELETE CASCADE,
  ator_id            INTEGER NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  acao               TEXT    NOT NULL CHECK (acao IN ('verificar', 'revogar')),
  status_anterior    TEXT    NOT NULL,
  status_novo        TEXT    NOT NULL,
  criado_em          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_eventos_verificacao_prestador ON eventos_verificacao (prestador_id);
