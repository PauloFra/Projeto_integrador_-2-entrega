# Arquitetura

## Visão geral

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ NAVEGADOR                                                                   │
│                                                                             │
│  React 18 + TypeScript (Vite :5173)                                         │
│  ┌───────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ paginas/  │─▶│ componentes/ │  │ contexto/    │  │ servicos/api.ts    │  │
│  │ (telas)   │  │ (UI)         │  │ sessão+aviso │  │ único ponto de     │  │
│  └─────┬─────┘  └──────────────┘  └──────────────┘  │ fetch, tipado      │  │
│        │                                            └──────────┬─────────┘  │
└────────┼───────────────────────────────────────────────────────┼────────────┘
         │ hooks/useRecurso                     HTTP + Bearer    │
         └───────────────────────────────────────────────────────┘
                                   │  /api/*  (proxy do Vite em dev)
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ API REST — Node.js + Express (:3333)                                        │
│                                                                             │
│  routes ──▶ middlewares (auth, log) ──▶ controllers ──▶ services            │
│                                                            │                │
│                                                            ▼                │
│                                                      repositories           │
└────────────────────────────────────────────────────────────┬────────────────┘
                                                             │ SQL preparado
                                                             ▼
                                        ┌────────────────────────────────────┐
                                        │ SQLite — backend/data/patas.db     │
                                        │ 13 tabelas · FKs · índices · WAL   │
                                        └────────────────────────────────────┘
```

## Fluxo de uma requisição

Exemplo: **a Camila cria um passeio de 60 minutos com o Roberto.**

| # | Onde | O que acontece |
|---|---|---|
| 1 | `ModalAgendamento.tsx` | o formulário monta o payload e chama `api.criarAgendamento()` |
| 2 | `servicos/api.ts` | adiciona `Authorization: Bearer <token>` e faz `POST /api/agendamentos` |
| 3 | Vite (dev) | encaminha `/api/*` para `http://localhost:3333` |
| 4 | `app.js` | CORS, `express.json()`, log da requisição |
| 5 | `routes/index.js` | casa a rota e aplica `exigirAutenticacao` + `exigirPapel('tutor')` |
| 6 | `middlewares/auth.js` | valida a assinatura e a expiração do token e popula `req.usuario` |
| 7 | `controllers/agendamentoController.js` | repassa `req.usuario` e `req.body` ao serviço |
| 8 | `services/agendamentoService.js` | valida o payload, aplica as 6 regras, calcula o valor e abre uma transação |
| 9 | `repositories/*` | `INSERT` do agendamento, da conversa e da primeira mensagem |
| 10 | resposta | `201` com o agendamento completo (pet, prestador, serviço, `conversaId`) |
| 11 | interface | fecha o modal, mostra a notificação e recarrega os dados afetados |

Se qualquer regra falhar, o serviço lança `AppError`; o `errorHandler` devolve o status
adequado com mensagem em português, e nada é gravado (a transação não é aberta).

## Decisões técnicas

| Decisão | Alternativa descartada | Por quê |
|---|---|---|
| Camadas explícitas no backend | tudo no controller | regra de negócio testável e independente de HTTP |
| SQLite com SQL em arquivo | ORM (Prisma/Sequelize) | SQL visível e auditável, zero instalação, sem geração de código |
| Token HMAC com `node:crypto` | biblioteca de JWT | demonstra o conceito sem dependência extra |
| Validação própria (`utils/validate.js`) | Zod/Joi | o escopo é pequeno e as mensagens saem em português |
| `useRecurso` | React Query / Redux | a PoC tem poucas telas; menos conceito para a equipe manter |
| CSS com tokens | Tailwind / biblioteca de componentes | preserva o visual do protótipo com controle total e sem build extra |
| Proxy do Vite para `/api` | chamar `http://localhost:3333` direto | evita CORS em dev e deixa a URL igual em produção atrás de proxy |
| Média de avaliação denormalizada | `AVG()` a cada busca | mantém a busca em uma consulta e preserva o histórico anterior à PoC |
| Distância em JavaScript | extensão geoespacial | SQLite não tem funções geográficas; o volume da PoC não exige índice espacial |

## Pontos de atenção para evoluir

| Hoje (PoC) | Produção |
|---|---|
| SQLite em arquivo local | PostgreSQL gerenciado (trocar só `repositories/`) |
| Token HMAC em `localStorage` | JWT com *refresh token* em cookie `httpOnly` |
| Média denormalizada atualizada no serviço | recálculo assíncrono ou materialização no banco |
| Mensagens por recarga ao enviar | WebSocket ou SSE para tempo real |
| Mapa esquemático por coordenadas | mapa real (Leaflet/Google) com rota do passeio |
| Valores apenas calculados | integração com meio de pagamento e repasse |
| Verificação manual pela clínica | upload de documentos com validação automatizada |
| Testes de integração da API | somar testes de interface (Playwright) e de carga |
