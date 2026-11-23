# Modelo de dados

Banco: **SQLite** · arquivo `backend/data/patas.db` · DDL completo em
[`../backend/src/database/schema.sql`](../backend/src/database/schema.sql).

## Diagrama lógico

```
                       ┌───────────────┐
                       │  servicos     │
                       └───────┬───────┘
                               │ 1
                               │
             ┌─────────────────▼──────────────────┐
┌──────────┐ │          prestadores               │        ┌───────────────┐
│ usuarios │─┤  usuario_id (1:1) · clinica_id (N) ├───────▶│   clinicas    │
│          │ └─────────────────┬──────────────────┘        └───────┬───────┘
│ papel:   │                   │ 1                                 │ 1
│ tutor    │                   │                                   │
│ prestador│                   │ N                                 │ N
│ clinica  │         ┌─────────▼─────────┐              ┌──────────▼──────────┐
└────┬─────┘         │   agendamentos    │              │ consultas_clinica   │
     │ 1             │  status (ciclo)   │              └──────────┬──────────┘
     │               └────┬────────┬─────┘                         │
     │ N                  │ 1      │ 1                             │ N
┌────▼─────┐              │        │                               │
│   pets   │◀─────────────┘        │                               │
│          │  N                    │                               │
└────┬─────┘                       │                               │
     │ 1                     ┌─────▼──────┐   ┌──────────────┐     │
     │ N                     │ avaliacoes │   │  conversas   │     │
┌────▼──────────────┐        └────────────┘   └──────┬───────┘     │
│ registros_saude   │                               │ 1            │
└───────────────────┘                               │ N            │
┌───────────────────┐                        ┌──────▼───────┐      │
│ notas_veterinarias│◀───────────────────────│  mensagens   │      │
└───────────────────┘        (pet_id, clinica_id)─────────────      │
┌──────────────────────┐                                           │
│ eventos_verificacao  │  (prestador_id, ator_id)                  │
└──────────────────────┘                                           │
                                     pets ◀────────────────────────┘
```

## Dicionário de dados

### `usuarios` — tutores, prestadores e gestores de clínica

| Coluna | Tipo | Observações |
|---|---|---|
| `id` | INTEGER PK | |
| `nome`, `email` | TEXT | `email` único (login) |
| `senha_hash` | TEXT | `scrypt$<salt>$<hash>` |
| `papel` | TEXT | `tutor` · `prestador` · `clinica` (CHECK) |
| `bairro`, `cidade` | TEXT | exibidos no cabeçalho |
| `latitude`, `longitude` | REAL | origem/destino do cálculo de distância |
| `avatar_url` | TEXT | foto opcional |

### `servicos` — catálogo

`slug` único (`passeio`, `pet-sitter`, `banho-tosa`, `veterinario`), `nome`, `icone`, `ordem`.

### `clinicas`

`nome`, `cnpj`, `bairro`, `cidade`, coordenadas, `telefone`, `responsavel_id → usuarios`.

### `prestadores` — perfil profissional

| Coluna | Observações |
|---|---|
| `usuario_id` | 1:1 com `usuarios` (UNIQUE, `ON DELETE CASCADE`) |
| `servico_id` | serviço oferecido |
| `nome_documento` | nome em documento, exibido no painel da clínica |
| `titulo`, `especialidade`, `bio` | apresentação na busca |
| `preco_centavos`, `duracao_minutos` | base do cálculo de valor |
| `avaliacao_media`, `avaliacoes_total` | **denormalização** mantida pelo serviço de avaliação |
| `disponivel_agora` | 0/1 — filtro “Disponível agora” |
| `verificacao_status` | `pendente` · `verificado` · `revogado` (CHECK) |
| `verificado_em`, `documento` | trilha da verificação |
| `clinica_id` | clínica que responde pela indicação |

### `pets`

`tutor_id → usuarios`, `nome`, `especie`, `raca`, `sexo` (`femea`/`macho`), `idade_anos`,
`peso_kg`, `porte` (`pequeno`/`medio`/`grande`), `castrado`, `microchipado`, `sociavel`,
`sobre`, `foto_url`.

### `registros_saude` — carteira de vacinação

`pet_id`, `tipo` (`vacina`/`vermifugo`/`antipulgas`/`exame`/`consulta`), `nome`,
`aplicado_em`, `proxima_dose`, `status` (`em_dia`/`protegida`/`atrasado`), `observacao`.

> O `status` é recalculado na leitura: `proxima_dose` no passado ⇒ `atrasado`.

### `notas_veterinarias`

`pet_id`, `clinica_id`, `veterinario_nome`, `crmv`, `conteudo`, `registrado_em`.

### `agendamentos` — cuidados contratados

| Coluna | Observações |
|---|---|
| `codigo` | identificador curto e legível (`PC-7K3QD2`), único |
| `tutor_id`, `pet_id`, `prestador_id`, `servico_id` | relacionamentos |
| `titulo` | gerado (`Passeio da Luna`) ou informado |
| `inicio_em` | ISO local sem fuso: `2026-11-27T15:00:00` |
| `duracao_minutos`, `valor_centavos` | valor **calculado** no servidor |
| `status` | `solicitado` → `confirmado` → `em_andamento` → `concluido`; `cancelado` (CHECK) |
| `local_encontro`, `observacoes` | combinados do atendimento |
| `concluido_em`, `cancelado_motivo` | registro do desfecho |
| `criado_em`, `atualizado_em` | auditoria (ISO UTC) |

Índices: `tutor_id`, `prestador_id`, `status`, `inicio_em`.

### `avaliacoes`

`agendamento_id` **UNIQUE** (uma por atendimento), `autor_id`, `prestador_id`,
`nota` (CHECK 1–5), `comentario`.

### `conversas` e `mensagens`

`conversas.agendamento_id` **UNIQUE** — a conversa nasce com o agendamento.
`mensagens`: `conversa_id`, `autor_id`, `conteudo`, `lida`, `enviado_em`.

### `consultas_clinica`

`pet_id`, `clinica_id`, `titulo`, `inicio_em`, `veterinario_nome`,
`status` (`confirmada`/`realizada`/`cancelada`), `observacao`.

### `eventos_verificacao` — auditoria da clínica

`prestador_id`, `ator_id`, `acao` (`verificar`/`revogar`), `status_anterior`,
`status_novo`, `criado_em`.

## Convenções

| Assunto | Decisão |
|---|---|
| Nomes | português, `snake_case`; chaves estrangeiras como `<tabela_singular>_id` |
| Dinheiro | centavos em `INTEGER` — sem erro de ponto flutuante |
| Datas de agendamento | ISO local sem fuso (`2026-11-25T10:00:00`): ordem alfabética = ordem cronológica |
| Timestamps de auditoria | ISO UTC (`strftime('%Y-%m-%dT%H:%M:%SZ','now')`) |
| Booleanos | `INTEGER` 0/1 com `CHECK` |
| Integridade | `PRAGMA foreign_keys = ON`, `ON DELETE CASCADE` onde o filho não existe sem o pai |
| Segurança | apenas consultas preparadas (`db.prepare`) |

## Consultas dos indicadores

**Agenda do prestador** — “atendimentos no mês” e “recebido no mês”:

```sql
SELECT COUNT(*) AS total, COALESCE(SUM(valor_centavos), 0) AS valor
  FROM agendamentos
 WHERE prestador_id = ?
   AND status = 'concluido'
   AND substr(inicio_em, 1, 7) = ?;   -- '2026-11'
```

**Painel da clínica** — “serviços no mês” e “pets acompanhados”:

```sql
SELECT COUNT(*)                AS servicos,
       COUNT(DISTINCT a.pet_id) AS pets
  FROM agendamentos a
  JOIN prestadores pr ON pr.id = a.prestador_id
 WHERE pr.clinica_id = ?
   AND substr(a.inicio_em, 1, 7) = ?
   AND a.status <> 'cancelado';
```

**Conflito de horário** (a parte em SQL; a sobreposição é verificada no serviço):

```sql
SELECT * FROM agendamentos
 WHERE prestador_id = ?
   AND status IN ('solicitado', 'confirmado', 'em_andamento');
```

## Volume carregado pelo seed

| Tabela | Registros |
|---|---|
| `usuarios` | 16 (1 tutora principal + 8 tutores + 6 prestadores + 1 clínica) |
| `servicos` | 4 |
| `clinicas` | 1 |
| `prestadores` | 6 (5 verificados, 1 pendente) |
| `pets` | 32 |
| `registros_saude` | 4 (carteira da Luna) |
| `notas_veterinarias` | 1 |
| `agendamentos` | 48 no mês corrente (46 concluídos + 2 confirmados) |
| `avaliacoes` | 2 |
| `conversas` / `mensagens` | 2 / 3 |
| `consultas_clinica` | 2 (uma realizada, uma confirmada) |

Volume calibrado para reproduzir os indicadores do protótipo: **24 × R$ 35 = R$ 840** no
mês do Roberto, **48 serviços** e **32 pets** na rede da clínica.
