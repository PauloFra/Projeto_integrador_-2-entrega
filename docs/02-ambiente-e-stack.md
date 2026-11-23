# Etapa 2 — Preparação do ambiente: stack e infraestrutura

> **Entregável:** stack definida e servidor de desenvolvimento pronto.
> **Anterior:** [jornada da PoC](01-jornada-poc.md) · **Próximo:** [frontend](03-frontend.md).

## 2.1 Stack escolhida

| Camada | Tecnologia | Versão | Por que esta |
|---|---|---|---|
| Interface | **React** + **TypeScript** | 18.3 / 5.7 | componentização madura, tipos evitam erro de contrato com a API e a equipe já conhecia |
| Build / dev server | **Vite** | 5.4 | servidor instantâneo, *hot reload*, proxy para a API (resolve CORS em dev) e build otimizado |
| Rotas | **React Router** | 6.28 | rotas aninhadas e proteção por papel com pouco código |
| Ícones | **lucide-react** | 0.468 | mesma família de ícones usada no protótipo da 1ª etapa |
| Estilo | **CSS moderno** com *design tokens* | — | zero dependência extra; `oklch`, `color-mix` e *container queries* dão conta do design |
| Servidor | **Node.js** + **Express** | 18+ / 4.21 | JavaScript nas duas pontas, ecossistema vasto, curva curta |
| Banco de dados | **SQLite** via `better-sqlite3` | 11.8 | SQL de verdade (chaves, índices, transações) em um arquivo: clonar e rodar, sem instalar servidor |
| Autenticação | `node:crypto` (scrypt + HMAC-SHA256) | nativo | demonstra o conceito sem arrastar dependência de JWT |
| Testes | `node:test` + `assert` | nativo | roda com `node --test`, sem framework adicional |
| Versionamento | Git + GitHub | — | histórico por integrante e colaboração em PRs |

### Dependências de produção (6 no total)

```
backend/   better-sqlite3 · cors · dotenv · express
frontend/  react · react-dom · react-router-dom · lucide-react
```

Poucas dependências foi um critério explícito: menos risco de `npm install` quebrar na
máquina de quem for avaliar o projeto.

### Por que SQLite e não PostgreSQL/MySQL

| Critério | SQLite | Postgres/MySQL |
|---|---|---|
| Rodar o projeto do zero | `npm run db:setup` | instalar servidor, criar usuário e base |
| SQL, chaves estrangeiras, índices, transações | sim | sim |
| Adequado ao volume da PoC | sim (arquivo local) | excesso para o escopo |
| Caminho de evolução | trocar o repositório por um cliente `pg` mantendo serviços e controllers | — |

O acesso a dados está isolado em `backend/src/repositories/`: migrar de banco significa
reescrever essa pasta, sem tocar em regras de negócio nem na interface.

## 2.2 Organização do repositório

Monorepo com **npm workspaces**: um `npm install` na raiz instala frontend e backend, e os
scripts da raiz orquestram os dois.

```jsonc
// package.json (raiz)
{
  "workspaces": ["backend", "frontend"],
  "scripts": {
    "setup": "node scripts/setup.mjs",   // .env + banco
    "dev":   "node scripts/dev.mjs"      // sobe os dois servidores
  }
}
```

[`scripts/dev.mjs`](../scripts/dev.mjs) sobe API e frontend em paralelo com a saída
identificada por prefixo (`[api]` / `[web]`) — sem precisar de `concurrently`.

## 2.3 Configuração por ambiente

Nada de segredo ou porta fixa no código: tudo vem de variáveis de ambiente, com
`.env.example` versionado como documentação.

**`backend/.env`**

| Variável | Padrão | Função |
|---|---|---|
| `PORT` | `3333` | porta da API |
| `NODE_ENV` | `development` | `test` silencia logs e usa outro banco |
| `DATABASE_FILE` | `./data/patas.db` | arquivo SQLite |
| `CORS_ORIGIN` | `http://localhost:5173` | origens liberadas |
| `AUTH_SECRET` | *(trocar em produção)* | assinatura do token |
| `AUTH_TOKEN_TTL_HOURS` | `12` | validade da sessão |

**`frontend/.env`**

| Variável | Padrão | Função |
|---|---|---|
| `VITE_API_URL` | `/api` | base das chamadas no navegador |
| `VITE_API_PROXY` | `http://localhost:3333` | destino do proxy do Vite |

## 2.4 Servidores de desenvolvimento

```
 npm run dev
 ├── [api] node --watch backend/src/server.js   →  http://localhost:3333
 └── [web] vite                                 →  http://localhost:5173
                                                     └── /api/* ──proxy──▶ :3333
```

- `node --watch` reinicia a API a cada alteração (recurso nativo, sem nodemon);
- o proxy do Vite faz o navegador ver uma única origem, eliminando CORS em
  desenvolvimento; o CORS do Express continua configurado para o cenário de deploy
  com domínios separados.

## 2.5 Preparação do banco (infra de dados)

| Script | Arquivo | O que faz |
|---|---|---|
| `npm run db:migrate` | `database/migrate.js` | aplica `schema.sql` (idempotente) |
| `npm run db:seed` | `database/seed.js` | limpa e recarrega os dados de demonstração |
| `npm run db:reset` | `database/reset.js` | apaga o arquivo e refaz tudo |

O `server.js` verifica a existência do arquivo do banco antes de subir e, se faltar,
encerra com a instrução exata a executar — evita o clássico “abri e deu erro estranho”.

## 2.6 Checklist de ambiente pronto

```bash
node -v                                   # v18.18 ou superior
npm install                               # dependências dos dois projetos
npm run setup                             # .env + schema + dados
npm test                                  # 29 testes passando
npm run dev                               # api :3333 + web :5173
curl http://localhost:3333/api/health     # {"status":"ok", ...}
```

Tudo verde ⇒ ambiente da PoC pronto para o desenvolvimento das etapas 3 e 4.
