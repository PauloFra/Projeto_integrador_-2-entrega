# Etapa 1 — Definição da PoC: a jornada selecionada

> **Entregável:** jornada (UX) escolhida e mapeada para implementação.
> **Próximo passo:** [preparação do ambiente](02-ambiente-e-stack.md).

## 1.1 De onde partimos

A 1ª etapa entregou um protótipo navegável (preservado em [`../prototipo/`](../prototipo/)
e no vídeo em [`midia/`](midia/)) com seis telas e três perfis de usuário:

| Tela do protótipo | Perfil | Jornada associada |
|---|---|---|
| Início | Tutor | descobrir e contratar um cuidado |
| Meus passeios | Tutor | acompanhar e revisitar cuidados |
| Meus pets (Luna) | Tutor | manter a saúde do pet em dia |
| Mensagens | Tutor / Prestador | combinar detalhes com quem cuida |
| Agenda do prestador | Prestador | organizar atendimentos e receber |
| Painel da clínica | Clínica | verificar profissionais da rede |

## 1.2 A jornada escolhida

**“Agendar um cuidado de confiança para a Luna.”**

Critérios que levaram a essa escolha:

1. **Valor para o usuário** — é o motivo pelo qual alguém instala o aplicativo;
2. **Cobertura técnica** — atravessa busca, autenticação, escrita no banco, regras de
   negócio, mensagens e indicadores, provando a arquitetura inteira;
3. **Risco a ser testado** — a hipótese central do produto é *“tutores confiam em
   profissionais verificados próximos”*; só uma jornada completa permite validá-la;
4. **Demonstrabilidade** — cabe em 5 minutos de apresentação com efeito visível em
   três perfis diferentes.

### Fluxo implementado

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌───────────┐   ┌────────────┐   ┌─────────┐
│Descobrir │──▶│ Filtrar  │──▶│ Agendar  │──▶│ Conversar │──▶│ Acompanhar │──▶│ Avaliar │
└──────────┘   └──────────┘   └──────────┘   └───────────┘   └────────────┘   └─────────┘
  Início         Início       Modal/API        Mensagens      Passeios +        Passeios
                                                              Agenda do
                                                              prestador
```

## 1.3 Personas

| Persona | Quem é | Dor principal | O que a PoC entrega |
|---|---|---|---|
| **Camila Andrade**, 32, tutora da Luna | mora na Vila Mariana, trabalha fora o dia inteiro | “não sei em quem confiar para deixar minha cachorra” | profissionais verificados, perto, com avaliações reais e conversa direta |
| **Roberto Neves**, 38, dog walker | atende a região a pé, agenda no caderno | “perco pedidos e não sei quanto recebi no mês” | agenda única e indicadores do mês calculados automaticamente |
| **Clínica Pet Vida** (gestão) | clínica do bairro que indica profissionais | “minha indicação é meu nome em risco” | painel com documentação e verificação que bloqueia quem não está em dia |

## 1.4 Mapa da jornada principal

| # | Passo da Camila | Tela | Endpoint | Regra de negócio aplicada |
|---|---|---|---|---|
| 1 | entra no app | `Entrar` | `POST /auth/login` | senha com hash scrypt; token válido por 12 h |
| 2 | vê quem está por perto | `Início` | `GET /prestadores?servico=passeio` | distância por Haversine a partir do endereço dela |
| 3 | filtra por confiança/preço | `Início` | `GET /prestadores?raioKm=1&notaMinima=4.9` | filtros aplicados em SQL, ordenação por distância |
| 4 | escolhe o Roberto | `Modal` | `GET /prestadores/:id` | exibe avaliações recentes e status de verificação |
| 5 | marca 60 min | `Modal` | `POST /agendamentos` | pet do tutor, profissional verificado, data futura, sem conflito, valor proporcional |
| 6 | manda um recado | `Mensagens` | `POST /conversas/:id/mensagens` | conversa criada junto com o agendamento |
| 7 | acompanha o status | `Meus passeios` | `GET /agendamentos` | status muda conforme o profissional conduz o atendimento |
| 8 | avalia | `Meus passeios` | `POST /agendamentos/:id/avaliacao` | uma avaliação por atendimento; recalcula a média |

### Jornadas de apoio

| # | Passo do Roberto (prestador) | Endpoint |
|---|---|---|
| 1 | vê indicadores e próximos atendimentos | `GET /prestador/agenda` |
| 2 | confirma, inicia e conclui o passeio | `PATCH /agendamentos/:id/status` |
| 3 | sinaliza disponibilidade | `PATCH /prestadores/disponibilidade` |

| # | Passo da clínica | Endpoint |
|---|---|---|
| 1 | acompanha indicadores da rede | `GET /clinica/visao-geral` |
| 2 | verifica ou revoga documentação | `PATCH /clinica/profissionais/:id/verificacao` |

## 1.5 Critérios de aceite da PoC

| # | Critério | Como verificar | Situação |
|---|---|---|---|
| CA1 | a busca mostra apenas profissionais do serviço escolhido, do mais perto ao mais longe | entrar como Camila: 0,8 / 1,2 / 1,6 km | ✅ |
| CA2 | o filtro de 1 km reduz a lista para um profissional | mudar o filtro de distância | ✅ |
| CA3 | o agendamento de 60 min com o Roberto custa R$ 70 | criar o pedido no modal | ✅ |
| CA4 | o pedido aparece na agenda do profissional sem intervenção manual | entrar como Roberto | ✅ |
| CA5 | o agendamento abre uma conversa entre tutor e profissional | abrir *Mensagens* | ✅ |
| CA6 | só o profissional confirma/inicia/conclui; só o tutor cancela ou avalia | tentar pelos dois perfis | ✅ |
| CA7 | a avaliação recalcula a média exibida na busca | avaliar com 4 estrelas → 4,89 | ✅ |
| CA8 | profissional revogado pela clínica não recebe novos agendamentos | revogar e tentar agendar | ✅ |
| CA9 | a carteira de saúde mostra a vigência de cada dose e aceita novos registros | perfil da Luna → *Registrar* | ✅ |
| CA10 | os indicadores de prestador e clínica vêm do banco, não de valores fixos | `npm test` + conferir no painel | ✅ |

## 1.6 Fora do escopo desta PoC

Decisões conscientes, para manter o foco na hipótese central:

- pagamento real (os valores são calculados e exibidos, mas não há cobrança);
- rastreamento do passeio em tempo real por GPS (o mapa é esquemático);
- notificações push e e-mail transacional;
- cadastro público de novos profissionais com upload de documentos (a verificação é
  feita pela clínica sobre dados já cadastrados);
- aplicativo nativo — a interface é web responsiva, instalável como atalho.
