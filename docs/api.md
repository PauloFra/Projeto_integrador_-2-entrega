# Referência da API — Patas Conectadas

Base: `http://localhost:3333/api` · corpo e resposta em **JSON** (UTF-8).

## Autenticação

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "camila@patasconectadas.app", "senha": "patas123" }
```

```json
{
  "token": "eyJzdWIiOjEs….kPmRLtITs9XM…",
  "usuario": {
    "id": 1,
    "nome": "Camila Andrade",
    "email": "camila@patasconectadas.app",
    "papel": "tutor",
    "bairro": "Vila Mariana",
    "cidade": "São Paulo",
    "coordenada": { "lat": -23.5893, "lng": -46.6349 }
  }
}
```

Envie o token nas rotas protegidas:

```http
Authorization: Bearer <token>
```

O token expira em 12 horas (`AUTH_TOKEN_TTL_HOURS`). Perfis de demonstração e senha
estão no [README](../README.md#8-usuários-de-demonstração).

## Formato dos erros

```json
{ "erro": "Mensagem em português.", "detalhes": { "campo": "o que está errado" } }
```

| Status | Quando |
|---|---|
| `400` | payload inválido (sempre com `detalhes` por campo) ou regra de formato |
| `401` | sem token, token inválido ou expirado |
| `403` | papel sem acesso à área, ou recurso de outra pessoa |
| `404` | recurso inexistente |
| `409` | conflito de regra de negócio (horário ocupado, status inválido, avaliação repetida) |
| `500` | falha inesperada (mensagem genérica; detalhes só no log do servidor) |

---

## Saúde e catálogo

### `GET /health` · público

```json
{ "status": "ok", "servico": "patas-conectadas-api", "horario": "2026-11-23T18:03:43.405Z" }
```

### `GET /servicos` · público

```json
{
  "servicos": [
    { "id": 1, "slug": "passeio", "nome": "Passeio", "icone": "footprints", "totalPrestadores": 3 },
    { "id": 2, "slug": "pet-sitter", "nome": "Pet sitter", "totalPrestadores": 1 }
  ]
}
```

---

## Profissionais

### `GET /prestadores` · autenticação opcional

Busca com filtros. **Com** token, cada item traz `distanciaKm` calculada a partir do
endereço do usuário.

| Parâmetro | Exemplo | Efeito |
|---|---|---|
| `servico` | `passeio` | slug do serviço (erro `400` se não existir) |
| `raioKm` | `1` | distância máxima em km |
| `notaMinima` | `4.9` | avaliação média mínima |
| `precoMaximo` | `35` | preço máximo **em reais** |
| `disponivelAgora` | `true` | só quem está disponível |
| `termo` | `mariana` | busca em nome, título e especialidade |
| `apenasVerificados` | `true` | só documentação verificada |
| `ordenar` | `distancia` \| `avaliacao` \| `preco` | ordenação (padrão: `distancia`) |

```http
GET /api/prestadores?servico=passeio&raioKm=2&ordenar=distancia
Authorization: Bearer <token>
```

```json
{
  "total": 2,
  "filtrosAplicados": { "servico": "passeio", "raioKm": 2, "notaMinima": null,
                        "precoMaximo": null, "disponivelAgora": null, "ordenar": "distancia" },
  "origem": { "lat": -23.5893, "lng": -46.6349 },
  "prestadores": [
    {
      "id": 1,
      "nome": "Roberto Neves",
      "titulo": "Dog walker",
      "especialidade": "Pets de todos os portes",
      "precoCentavos": 3500,
      "duracaoMinutos": 30,
      "avaliacaoMedia": 4.9,
      "avaliacoesTotal": 128,
      "disponivelAgora": true,
      "verificacao": { "status": "verificado", "verificadoEm": "2026-07-26T09:00:00", "documento": "RG 23.114.882-0 · Curso de manejo canino (2023)" },
      "coordenada": { "lat": -23.5821, "lng": -46.6349 },
      "servico": { "slug": "passeio", "nome": "Passeio", "icone": "footprints" },
      "distanciaKm": 0.8
    }
  ]
}
```

### `GET /prestadores/:id` · autenticação opcional

Mesmo objeto, mais `avaliacoesRecentes` (até 5).

### `PATCH /prestadores/disponibilidade` · prestador

```json
{ "disponivelAgora": false }
```

---

## Pets e carteira de saúde

### `GET /pets` · tutor

```json
{ "pets": [ { "id": 1, "nome": "Luna", "raca": "Vira-lata", "sexo": "femea",
              "idadeAnos": 3, "pesoKg": 14.5, "porte": "medio",
              "castrado": true, "microchipado": true, "fotoUrl": "/imagens/luna.webp" } ] }
```

### `GET /pets/:id` · tutor (dono)

Perfil completo usado na tela do pet:

```json
{
  "id": 1, "nome": "Luna", "…": "…",
  "saude": {
    "emDia": true,
    "registros": [
      { "id": 4, "tipo": "antipulgas", "nome": "Antipulgas — NexGard",
        "aplicadoEm": "2026-11-05", "proximaDose": "2026-12-05",
        "status": "protegida", "diasParaProximaDose": 12 }
    ],
    "notas": [
      { "veterinarioNome": "Dra. Mariana Costa", "crmv": "CRMV-SP 42.518",
        "clinicaNome": "Clínica Pet Vida", "conteudo": "Boa condição geral…",
        "registradoEm": "2026-09-12" }
    ]
  },
  "historico": [
    { "tipo": "cuidado", "titulo": "Passeio com Roberto Neves",
      "quando": "2026-11-19T08:30:00", "detalhe": "30 min", "nota": 5, "status": "Concluído" }
  ],
  "proximaConsulta": { "titulo": "Check-up da Luna", "inicioEm": "2026-11-25T10:00:00",
                       "status": "confirmada", "clinicaNome": "Clínica Pet Vida" },
  "proximoCuidado": null
}
```

### `POST /pets` · tutor

```json
{ "nome": "Thor", "raca": "Beagle", "sexo": "macho", "idadeAnos": 2,
  "pesoKg": 11.4, "porte": "medio", "castrado": true }
```

### `PATCH /pets/:id` · tutor (dono) — campos parciais

### `POST /pets/:id/saude` · tutor (dono)

```json
{ "tipo": "vacina", "nome": "Vacina V10",
  "aplicadoEm": "2026-11-23T09:00:00", "proximaDose": "2027-11-23T09:00:00" }
```

`tipo` ∈ `vacina` · `vermifugo` · `antipulgas` · `exame` · `consulta`.

---

## Agendamentos

### `GET /agendamentos` · autenticado

Tutor recebe os cuidados dos seus pets; prestador recebe os atendimentos dele.

| Parâmetro | Efeito |
|---|---|
| `status=ativos` | `solicitado`, `confirmado` e `em_andamento` |
| `status=concluido` \| `cancelado` \| … | filtra por um status |
| `petId=1` | só de um pet (tutor) |

### `POST /agendamentos` · tutor

```json
{
  "petId": 1,
  "prestadorId": 1,
  "inicioEm": "2026-11-27T15:00:00",
  "duracaoMinutos": 60,
  "localEncontro": "Portaria do edifício",
  "observacoes": "A Luna puxa um pouco no começo do passeio."
}
```

`201 Created`:

```json
{
  "id": 49, "codigo": "PC-CGNLYA", "titulo": "Passeio da Luna",
  "inicioEm": "2026-11-27T15:00:00", "duracaoMinutos": 60,
  "valorCentavos": 7000, "status": "solicitado",
  "pet": { "id": 1, "nome": "Luna" },
  "prestador": { "id": 1, "nome": "Roberto Neves", "titulo": "Dog walker" },
  "servico": { "slug": "passeio", "nome": "Passeio" },
  "avaliacao": null,
  "conversaId": 3
}
```

Regras e respectivos erros:

| Situação | Status | Mensagem |
|---|---|---|
| pet de outra pessoa | `403` | `Este pet não pertence ao seu cadastro.` |
| profissional não verificado | `409` | `Este profissional teve a verificação revogada… / está com a verificação pendente…` |
| data no passado | `400` | `Escolha uma data e hora no futuro.` |
| duração fora da lista | `400` | `Duração inválida. Opções disponíveis: 30, 60, 90, 120, 240 minutos.` |
| horário ocupado | `409` | `O profissional já tem um atendimento nesse horário.` + `detalhes.conflitoCom` |

> O campo `valorCentavos` **não** é aceito na entrada: é calculado como
> `preço-base × duração / duração-base`.

### `PATCH /agendamentos/:id/status` · participante

```json
{ "status": "confirmado" }
```

`status` ∈ `confirmado` · `em_andamento` · `concluido` · `cancelado`
(opcional: `motivo`, usado no cancelamento).

| Status atual | Para | Quem pode |
|---|---|---|
| `solicitado` | `confirmado` | prestador |
| `solicitado` / `confirmado` | `cancelado` | tutor ou prestador |
| `confirmado` | `em_andamento` | prestador |
| `em_andamento` | `concluido` | prestador |

### `POST /agendamentos/:id/avaliacao` · tutor

```json
{ "nota": 4, "comentario": "Mandou fotos do trajeto todo." }
```

```json
{
  "avaliacao": { "id": 3, "nota": 4, "autorNome": "Camila Andrade" },
  "prestador": { "id": 1, "nome": "Roberto Neves", "avaliacaoMedia": 4.89, "avaliacoesTotal": 129 }
}
```

Só para atendimento `concluido` e uma única vez (`409` na segunda tentativa).

---

## Área do prestador

### `GET /prestador/agenda` · prestador

```json
{
  "prestador": { "id": 1, "nome": "Roberto Neves", "disponivelAgora": true },
  "indicadores": { "naAgenda": 2, "atendimentosNoMes": 24,
                   "recebidoNoMesCentavos": 84000, "avaliacaoMedia": 4.9 },
  "proximos": [ { "titulo": "Passeio do Thor", "inicioEm": "2026-11-23T17:00:00",
                  "status": "confirmado", "pet": { "nome": "Thor" },
                  "tutor": { "nome": "Juliana Mendes" } } ],
  "historico": [ "… últimos 10 concluídos …" ]
}
```

---

## Mensagens

### `GET /conversas` · autenticado

```json
{
  "naoLidas": 1,
  "conversas": [
    { "id": 3, "agendamento": { "id": 49, "titulo": "Passeio da Luna", "status": "solicitado" },
      "pet": { "nome": "Luna" },
      "contraparte": { "nome": "Roberto Neves", "papel": "prestador", "avatarUrl": "/imagens/roberto.webp" },
      "ultimaMensagem": "A Luna puxa um pouco no começo do passeio.",
      "ultimaMensagemEm": "2026-11-23T18:10:00Z", "naoLidas": 1 }
  ]
}
```

### `GET /conversas/:id` · participante

Devolve a conversa com `mensagens[]` e marca como lidas as mensagens da outra pessoa.

### `POST /conversas/:id/mensagens` · participante

```json
{ "conteudo": "Combinado! Levo a guia peitoral." }
```

Conversa de cuidado cancelado fica somente como histórico (`409` ao tentar enviar).

---

## Painel da clínica

### `GET /clinica/visao-geral` · clínica

```json
{
  "clinica": { "id": 1, "nome": "Clínica Pet Vida", "bairro": "Vila Mariana" },
  "indicadores": { "profissionaisParceiros": 6, "profissionaisVerificados": 5,
                   "servicosNoMes": 48, "petsAcompanhados": 32 },
  "profissionais": [
    { "id": 1, "nome": "Roberto Neves", "nomeDocumento": "Roberto Carlos Neves",
      "servico": { "nome": "Passeio" }, "avaliacaoMedia": 4.9,
      "verificacao": { "status": "verificado", "documento": "RG 23.114.882-0 · …" } }
  ],
  "eventosRecentes": [
    { "id": 1, "prestadorNome": "Roberto Neves", "atorNome": "Clínica Pet Vida",
      "acao": "revogar", "statusAnterior": "verificado", "statusNovo": "revogado",
      "criadoEm": "2026-11-23T18:20:00Z" }
  ]
}
```

### `PATCH /clinica/profissionais/:id/verificacao` · clínica

```json
{ "acao": "verificar" }
```

`acao` ∈ `verificar` · `revogar`. Repetir a ação já aplicada devolve `409`.
Revogar bloqueia novos agendamentos para o profissional imediatamente.

---

## Testando rapidamente

Use [`api.http`](api.http) (extensão *REST Client* do VS Code) ou:

```bash
TOKEN=$(curl -s -X POST http://localhost:3333/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"camila@patasconectadas.app","senha":"patas123"}' \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).token))")

curl -s "http://localhost:3333/api/prestadores?servico=passeio" -H "Authorization: Bearer $TOKEN"
```
