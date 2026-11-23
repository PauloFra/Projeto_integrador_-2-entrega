# Etapa 4 — Desenvolvimento Backend: lógica, APIs e repositório de dados

> **Entregável:** backend e dados integrados.
> **Anterior:** [frontend](03-frontend.md) · Ver também: [API](api.md) e [modelo de dados](modelo-de-dados.md).

## 4.1 Camadas

```
requisição HTTP
     │
     ▼
┌─────────────────┐  routes/index.js
│ Rotas           │  caminho + método + middlewares de acesso
└────────┬────────┘
         ▼
┌─────────────────┐  middlewares/auth.js
│ Autenticação    │  exigirAutenticacao · exigirPapel('tutor') · autenticacaoOpcional
└────────┬────────┘
         ▼
┌─────────────────┐  controllers/*.js
│ Controllers     │  lê req, devolve res — sem regra de negócio
└────────┬────────┘
         ▼
┌─────────────────┐  services/*.js
│ Serviços        │  REGRAS DE NEGÓCIO: validação, permissão, cálculo, transação
└────────┬────────┘
         ▼
┌─────────────────┐  repositories/*.js
│ Repositórios    │  SQL preparado + tradução linha ↔ objeto camelCase
└────────┬────────┘
         ▼
     SQLite (backend/data/patas.db)
```

Benefício prático: trocar SQLite por PostgreSQL exige reescrever apenas
`repositories/`; mudar de Express para Fastify afeta apenas `routes/` e `controllers/`.

## 4.2 Regras de negócio implementadas

### Criação de um cuidado — `services/agendamentoService.js`

Seis regras aplicadas em sequência antes de gravar:

| # | Regra | Resposta quando falha |
|---|---|---|
| 1 | o pet precisa pertencer ao tutor autenticado | `403` |
| 2 | o profissional precisa estar com verificação `verificado` | `409` |
| 3 | a duração precisa estar entre as opções permitidas (30/60/90/120/240) | `400` |
| 4 | a data/hora precisa ser futura | `400` |
| 5 | o profissional não pode ter outro atendimento no mesmo intervalo | `409` + código do conflito |
| 6 | o valor é calculado — nunca enviado pelo cliente | — |

```js
// o preço é sempre derivado do cadastro do profissional
const valorCentavos = Math.round(
  (prestador.precoCentavos * duracaoMinutos) / prestador.duracaoMinutos,
);
// Roberto: R$ 35 / 30 min  →  60 min = R$ 70
```

A gravação acontece em **transação**: agendamento + conversa + primeira mensagem são
criados juntos ou nada é criado.

### Ciclo de vida do atendimento

```
solicitado ──(prestador)──▶ confirmado ──(prestador)──▶ em_andamento ──(prestador)──▶ concluido
     │                           │
     └──────(tutor|prestador)────┴──▶ cancelado
```

A tabela de transições é declarativa, com os papéis autorizados em cada aresta:

```js
const TRANSICOES = {
  solicitado:   { confirmado: ['prestador'], cancelado: ['tutor', 'prestador'] },
  confirmado:   { em_andamento: ['prestador'], cancelado: ['tutor', 'prestador'] },
  em_andamento: { concluido: ['prestador'] },
  concluido:    {},
  cancelado:    {},
};
```

Transição inexistente → `409` com a lista de transições possíveis. Papel errado → `403`.

### Avaliação e média do profissional

Uma avaliação por atendimento concluído (`UNIQUE` no banco **e** verificação no serviço).
A média é mantida denormalizada para que a busca permaneça com uma consulta só:

```
nova_media = (media_atual × total + nota) / (total + 1)
4,90 × 128 + 4 = 616  →  616 / 129 = 4,89
```

### Busca por proximidade — `services/prestadorService.js`

Filtros de serviço, nota, preço, disponibilidade e texto são resolvidos em **SQL**;
distância e raio são resolvidos em JavaScript, porque SQLite não tem funções
geoespaciais:

```js
export const distanceInKm = (origem, destino) => { /* Haversine */ };
```

Resultado para o endereço da Camila (Vila Mariana): Roberto 0,8 km · Mariana 1,2 km ·
Lucas 1,6 km — os mesmos números do protótipo, agora calculados.

### Verificação pela clínica — `services/clinicaService.js`

Verificar/revogar altera o status do profissional **e** grava um evento de auditoria
(`eventos_verificacao`) com autor, ação e status anterior. Como a regra 2 da criação de
agendamento lê esse status, revogar um profissional bloqueia novos pedidos na hora.

### Carteira de saúde — `services/petService.js`

O status gravado é o informado, mas a vigência é recalculada na leitura: se
`proxima_dose` já passou, o item volta como `atrasado` e com `diasParaProximaDose`
negativo — a interface não precisa refazer essa conta.

## 4.3 Autenticação e autorização

Sem dependência externa: só `node:crypto`.

| Mecanismo | Implementação |
|---|---|
| Senha | `scrypt` com *salt* aleatório por usuário; comparação com `timingSafeEqual` |
| Token | `base64url(payload).HMAC-SHA256(payload, AUTH_SECRET)`, com `exp` de 12 h |
| Transporte | `Authorization: Bearer <token>` |
| Autorização | `exigirPapel('tutor' | 'prestador' | 'clinica')` nas rotas + checagem de propriedade nos serviços |

A checagem de papel na rota **não** substitui a checagem de propriedade: `GET /pets/:id`
exige sessão, mas é o serviço que garante que o pet é de quem pediu.

## 4.4 Validação de entrada

[`utils/validate.js`](../backend/src/utils/validate.js) oferece regras compostas e
devolve **todos** os problemas de uma vez:

```js
validate(dados, {
  petId:       [rules.required('Pet'), rules.integer('Pet', { min: 1 })],
  inicioEm:    [rules.required('Data e hora'), rules.isoDateTime('Data e hora')],
  observacoes: [rules.string('Observações', { min: 1, max: 500 })],
});
```

```json
{
  "erro": "Dados inválidos na requisição.",
  "detalhes": { "petId": "Pet é obrigatório.", "inicioEm": "Data e hora é obrigatório." }
}
```

## 4.5 Tratamento de erros

`AppError` carrega status e detalhes; o `errorHandler` traduz para JSON e esconde
detalhes internos em erro 500. Qualquer rejeição em handler assíncrono é capturada pelo
`asyncHandler`, sem `try/catch` repetido nos controllers.

| Situação | Status | Corpo |
|---|---|---|
| validação | `400` | `{ erro, detalhes }` |
| sem token / expirado | `401` | `{ erro }` |
| papel ou propriedade | `403` | `{ erro }` |
| recurso inexistente | `404` | `{ erro }` |
| conflito de regra | `409` | `{ erro, detalhes }` |
| falha inesperada | `500` | `{ erro: "Erro interno no servidor." }` |

## 4.6 Repositório de dados

13 tabelas com chaves estrangeiras, `CHECK` de domínio e índices — detalhadas em
[modelo-de-dados.md](modelo-de-dados.md).

Convenções:

- consultas sempre **preparadas** (`db.prepare(...)`), nunca concatenação de string —
  sem brecha de SQL injection;
- dinheiro em **centavos** (inteiro), evitando erro de ponto flutuante;
- datas de agendamento em ISO local sem fuso (`2026-11-25T10:00:00`), o que faz a
  ordem lexicográfica coincidir com a cronológica e simplifica os filtros por mês;
- `PRAGMA foreign_keys = ON` e `journal_mode = WAL` na abertura da conexão;
- escritas compostas em `db.transaction(...)`.

Indicadores vêm de SQL, não de constantes:

```sql
-- "Recebido no mês" da agenda do prestador
SELECT COUNT(*) AS total, COALESCE(SUM(valor_centavos), 0) AS valor
  FROM agendamentos
 WHERE prestador_id = ? AND status = 'concluido'
   AND substr(inicio_em, 1, 7) = ?;      -- competência "2026-11"
```

## 4.7 Carga de dados (scripts)

| Script | Função |
|---|---|
| `npm run db:migrate` | aplica `schema.sql` (idempotente) |
| `npm run db:seed` | limpa e recarrega a base de demonstração |
| `npm run db:reset` | apaga o arquivo e refaz schema + carga |

A carga cria 16 usuários, 6 profissionais, 32 pets, 48 agendamentos, avaliações,
conversas, carteira de saúde e consultas — com volume calibrado para que os indicadores
do protótipo apareçam calculados: 24 passeios × R$ 35 = **R$ 840** no mês do Roberto,
**48 serviços** e **32 pets** na rede da clínica. As datas são relativas ao dia da
execução, então a demonstração nunca fica vencida.

## 4.8 Testes

```bash
cd backend && npm test
```

29 testes de integração (`node:test`) sobem a API contra `backend/data/test.db` e cobrem:

| Grupo | O que valida |
|---|---|
| saúde e catálogo | `/health` e os 4 serviços |
| autenticação | senha errada, login válido, rota protegida, papel errado |
| busca | filtro por serviço, distâncias `[0.8, 1.2, 1.6]`, raio, preço, serviço inexistente |
| carteira de saúde | perfil completo da Luna, pet de outra pessoa (403), novo registro |
| ciclo de vida | criação, valor proporcional, conversa aberta, mensagem do prestador, conflito, data passada, transições por papel, transição inválida, avaliação e avaliação duplicada |
| agenda do prestador | indicadores do mês |
| painel da clínica | indicadores, revogação bloqueando agendamento, ação repetida |
| erros | rota inexistente e payload inválido com detalhes por campo |

Saída esperada: `# pass 29 / # fail 0`.
