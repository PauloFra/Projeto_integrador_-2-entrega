# Instalação e execução — guia detalhado

Guia completo para rodar o projeto do zero, em Windows, Linux ou macOS.
Para o caminho rápido (3 comandos), veja o [README](../README.md#caminho-rápido-3-comandos).

## 1. Requisitos

| Ferramenta | Versão | Verificar | Onde obter |
|---|---|---|---|
| Node.js | **18.18+** (recomendado 20 ou 22 LTS) | `node -v` | <https://nodejs.org> |
| npm | 9+ (vem com o Node) | `npm -v` | — |
| Git | recente | `git --version` | <https://git-scm.com> |

Não é preciso instalar banco de dados: o SQLite é um arquivo criado pelos scripts.
Portas usadas: **3333** (API) e **5173** (interface).

## 2. Obter o código

```bash
git clone https://github.com/PauloFra/Projeto_integrador_-2-entrega.git
cd Projeto_integrador_-2-entrega
```

## 3. Instalar dependências

Um único comando na raiz cobre backend e frontend (npm workspaces):

```bash
npm install
```

> Esperado: `added ~188 packages`. O aviso de *deprecated* em `prebuild-install`
> (dependência do `better-sqlite3`) é inofensivo.

## 4. Variáveis de ambiente

```bash
npm run setup
```

Esse comando cria `backend/.env` e `frontend/.env` a partir dos `.env.example`
(sem sobrescrever arquivos existentes) **e** prepara o banco. Para fazer só a parte
dos `.env`, manualmente:

```powershell
# Windows (PowerShell)
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

```bash
# Linux / macOS
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### O que cada variável faz

**`backend/.env`**

| Variável | Padrão | Função |
|---|---|---|
| `PORT` | `3333` | porta da API |
| `NODE_ENV` | `development` | `production` esconde o *stack trace*; `test` usa outro banco |
| `DATABASE_FILE` | `./data/patas.db` | caminho do arquivo SQLite (relativo a `backend/`) |
| `CORS_ORIGIN` | `http://localhost:5173,http://127.0.0.1:5173` | origens liberadas |
| `AUTH_SECRET` | valor de exemplo | assinatura do token — **trocar em produção** |
| `AUTH_TOKEN_TTL_HOURS` | `12` | validade da sessão |

**`frontend/.env`**

| Variável | Padrão | Função |
|---|---|---|
| `VITE_API_URL` | `/api` | base das chamadas feitas pelo navegador |
| `VITE_API_PROXY` | `http://localhost:3333` | destino do proxy do Vite |

Para consumir uma API hospedada em outro endereço, troque `VITE_API_URL` pela URL
completa (ex.: `https://api.exemplo.com/api`) e inclua a origem do site em `CORS_ORIGIN`.

## 5. Preparar o banco de dados

```bash
npm run db:setup       # schema + dados de demonstração
```

Saída esperada:

```
[migrate] banco: .../backend/data/patas.db
[migrate] 13 tabelas prontas: agendamentos, avaliacoes, clinicas, consultas_clinica,
          conversas, eventos_verificacao, mensagens, notas_veterinarias, pets,
          prestadores, registros_saude, servicos, usuarios
[seed] carga de demonstração concluída
┌──────────────────┬───────┐
│ usuarios         │ 16    │
│ prestadores      │ 6     │
│ pets             │ 32    │
│ agendamentos     │ 48    │
└──────────────────┴───────┘
[seed] senha de todos os usuários de demonstração: patas123
```

Comandos relacionados:

| Comando | Quando usar |
|---|---|
| `npm run db:seed` | recarregar os dados sem recriar as tabelas |
| `npm run db:reset` | voltar ao estado inicial depois de testar |

## 6. Subir os servidores

### Opção A — os dois juntos (recomendado)

```bash
npm run dev
```

```
[api] Patas Conectadas — API no ar
[api] http://localhost:3333/api/health
[web] VITE v5.4.11 ready
[web] ➜ Local: http://localhost:5173/
```

`Ctrl+C` encerra os dois.

### Opção B — terminais separados

```bash
npm run dev:backend     # terminal 1
npm run dev:frontend    # terminal 2
```

### Opção C — direto nas pastas

```bash
cd backend  && npm run dev
cd frontend && npm run dev
```

## 7. Conferir que está tudo no ar

```bash
curl http://localhost:3333/api/health
# {"status":"ok","servico":"patas-conectadas-api","horario":"..."}
```

Abra <http://localhost:5173> e entre com um dos perfis (senha `patas123`):

| Perfil | E-mail |
|---|---|
| Tutora Camila | `camila@patasconectadas.app` |
| Prestador Roberto | `roberto@patasconectadas.app` |
| Clínica Pet Vida | `clinica@patasconectadas.app` |

Na tela de entrada há um atalho por perfil — um clique faz o login.

## 8. Testes

```bash
npm test
```

29 testes de integração contra `backend/data/test.db` (não afeta a base de demonstração).
Esperado: `# pass 29` / `# fail 0`.

## 9. Build de produção

```bash
npm run build      # gera frontend/dist (typecheck + bundle)
npm run preview    # serve o build em http://localhost:4173
```

Para publicar: sirva `frontend/dist` em um servidor estático e rode a API com
`npm start` dentro de `backend/` (com `NODE_ENV=production` e `AUTH_SECRET` próprio).

## 10. Problemas comuns

### `O banco de dados ainda não existe`

```
Rode a preparação do repositório de dados antes de subir a API:
  npm run db:setup
```

É exatamente isso: execute `npm run db:setup` na raiz.

### A tela abre mas não carrega dados

A API não está no ar ou está em outra porta. Confirme
<http://localhost:3333/api/health> e, se mudou a porta, ajuste `VITE_API_PROXY` em
`frontend/.env` (e reinicie o Vite).

### `EADDRINUSE: address already in use :::3333`

Outra coisa está usando a porta:

```powershell
# Windows: descobrir e encerrar
netstat -ano | findstr :3333
taskkill /PID <pid> /F
```

```bash
# Linux / macOS
lsof -i :3333
kill -9 <pid>
```

Ou mude `PORT` em `backend/.env` (e `VITE_API_PROXY` no frontend).

### Erro ao compilar `better-sqlite3`

Acontece quando a versão do Node não tem binário pronto e falta compilador. Use Node
**20** ou **22 LTS** e reinstale:

```bash
rm -rf node_modules package-lock.json   # Windows: Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
```

### `401 Faça login para acessar este recurso`

O token expirou (12 h) ou o `AUTH_SECRET` mudou. Saia e entre novamente.

### `409 O profissional já tem um atendimento nesse horário`

É a regra de conflito de agenda funcionando: escolha outro horário.

### `403 Este pet não pertence ao seu cadastro`

Você está autenticado com outro perfil. Cada tutor só vê os pets dele.

### A base ficou estranha depois dos testes manuais

```bash
npm run db:reset
```

### `npm ERR! workspaces` ou scripts da raiz não funcionam

npm muito antigo (workspaces exigem npm 7+):

```bash
npm -v
npm install -g npm@latest
```
