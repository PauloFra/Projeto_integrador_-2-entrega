# Roteiro de apresentação da PoC

Duração alvo: **8 a 10 minutos** (demonstração de 5 min + contexto técnico).

## Antes de começar

```bash
npm run db:reset      # base no estado inicial
npm run dev           # api :3333 + web :5173
```

- abra <http://localhost:5173> já na tela de entrada;
- deixe um segundo navegador (ou janela anônima) aberto para o perfil do prestador —
  assim a troca de perfil não interrompe a narrativa;
- feche abas e notificações que possam aparecer na tela compartilhada.

## Parte 1 — O problema e a jornada (1 min)

> “A Camila mora na Vila Mariana e trabalha fora o dia inteiro. A dúvida dela não é
> *onde* encontrar um passeador, é **em quem confiar**. A PoC implementa exatamente essa
> jornada, de ponta a ponta: descobrir, filtrar por confiança, agendar, conversar,
> acompanhar e avaliar.”

Mostre o diagrama da jornada em [`01-jornada-poc.md`](01-jornada-poc.md).

## Parte 2 — A jornada da tutora (2,5 min)

| # | Ação | O que dizer |
|---|---|---|
| 1 | entrar como **Camila** | “três passeadores, com a distância calculada no servidor a partir do endereço dela: 0,8, 1,2 e 1,6 km” |
| 2 | filtro **Até 1 km** | “o filtro não é visual: a consulta volta ao servidor e sobra o Roberto” |
| 3 | alternar **Mapa** | “a mesma busca, posicionada por coordenada” |
| 4 | **Escolher** o Roberto, marcar **60 minutos** | “o valor sai de R$ 35 para **R$ 70** — o preço é calculado no backend, o cliente nunca manda o valor” |
| 5 | escrever um recado e confirmar | “o pedido entra como *aguardando confirmação*” |
| 6 | abrir **Mensagens** | “a conversa foi criada junto com o agendamento, e o recado virou a primeira mensagem” |

## Parte 3 — O outro lado do balcão (1,5 min)

| # | Ação | O que dizer |
|---|---|---|
| 1 | entrar como **Roberto** | “a agenda dele já tem o pedido da Camila — nada foi digitado duas vezes” |
| 2 | mostrar os indicadores | “24 atendimentos e R$ 840 no mês vêm de `SUM` e `COUNT` no banco, não de número fixo” |
| 3 | **Confirmar → Iniciar → Concluir** | “cada transição é validada: o tutor não pode confirmar em nome do profissional” |

## Parte 4 — Confiança e gestão (1,5 min)

| # | Ação | O que dizer |
|---|---|---|
| 1 | voltar como **Camila** → *Meus passeios* → **Avaliar** com 4 estrelas | “a média do Roberto cai de 4,90 para **4,89** — o cálculo acontece no servidor” |
| 2 | entrar como **Clínica Pet Vida** | “6 profissionais, 5 verificados, 48 serviços no mês, 32 pets: tudo consultado no banco” |
| 3 | **Revogar** o Roberto | “a clínica responde pela indicação; a ação fica registrada na trilha de auditoria” |
| 4 | tentar agendar como **Camila** | “o sistema bloqueia: a regra de verificação é do backend, não da tela” |
| 5 | **Verificar** de volta | “e volta a aceitar agendamentos” |

## Parte 5 — Como está construído (2 min)

Mostre, nesta ordem:

1. **estrutura de pastas** — `backend/` em camadas e `frontend/` por responsabilidade;
2. **uma regra de negócio** — `services/agendamentoService.js`: as seis validações e a
   tabela `TRANSICOES`;
3. **o schema** — `database/schema.sql`: 13 tabelas, chaves estrangeiras e `CHECK`;
4. **os testes** — rode `npm test` ao vivo: `# pass 29`.

> “A escolha de SQLite foi deliberada: quem for avaliar clona, roda `npm install`,
> `npm run setup` e `npm run dev` — sem instalar banco. E como o acesso a dados está
> isolado em `repositories/`, migrar para PostgreSQL significa reescrever só essa pasta.”

## Parte 6 — Limites e próximos passos (30 s)

Fora do escopo por decisão, não por esquecimento: pagamento real, GPS em tempo real,
notificações push e cadastro público de profissionais com upload de documentos
([lista completa](01-jornada-poc.md#16-fora-do-escopo-desta-poc)).

## Perguntas prováveis

| Pergunta | Resposta curta |
|---|---|
| “Os dados são fixos na tela?” | Não: `npm run db:reset` e os números voltam ao estado inicial; tudo vem de SQL. Dá para mostrar o banco com qualquer visualizador SQLite. |
| “Como vocês garantem que um usuário não vê dados de outro?” | Papel na rota (`exigirPapel`) **e** verificação de propriedade no serviço. Há testes para os dois casos (403). |
| “Por que SQLite?” | Reprodutibilidade e SQL de verdade; o repositório isola o acesso a dados para troca futura. |
| “A senha está em texto puro?” | Não: `scrypt` com *salt* por usuário, comparação em tempo constante. |
| “O que acontece se a API cair?” | A interface mostra o erro tratado em cada tela, sem quebrar. |
| “Quanto disso é código de verdade?” | Frontend, backend, schema, carga e 29 testes — o protótipo estático da 1ª etapa está preservado em `prototipo/` só como referência de UX. |
