# Etapa 3 — Desenvolvimento Frontend: a interface da jornada

> **Entregável:** frontend funcional (UI) implementando a experiência da jornada escolhida.
> **Anterior:** [ambiente e stack](02-ambiente-e-stack.md) · **Próximo:** [backend](04-backend.md).

## 3.1 Do protótipo ao código

O protótipo da 1ª etapa (em [`../prototipo/`](../prototipo/)) era estático: textos e
números fixos no HTML. Nesta etapa cada tela foi reconstruída em React + TypeScript
consumindo a API — **todo dado em tela vem do banco**.

| Tela do protótipo | Componente React | Fonte dos dados |
|---|---|---|
| Início | [`paginas/Inicio.tsx`](../frontend/src/paginas/Inicio.tsx) | `/servicos`, `/prestadores`, `/pets`, `/pets/:id` |
| Meus passeios | [`paginas/MeusPasseios.tsx`](../frontend/src/paginas/MeusPasseios.tsx) | `/agendamentos` |
| Meus pets (Luna) | [`paginas/PerfilPet.tsx`](../frontend/src/paginas/PerfilPet.tsx) | `/pets/:id`, `POST /pets/:id/saude` |
| Mensagens | [`paginas/Mensagens.tsx`](../frontend/src/paginas/Mensagens.tsx) | `/conversas`, `/conversas/:id` |
| Agenda do prestador | [`paginas/AgendaPrestador.tsx`](../frontend/src/paginas/AgendaPrestador.tsx) | `/prestador/agenda` |
| Painel da clínica | [`paginas/PainelClinica.tsx`](../frontend/src/paginas/PainelClinica.tsx) | `/clinica/visao-geral` |
| *(novo)* Entrar | [`paginas/Entrar.tsx`](../frontend/src/paginas/Entrar.tsx) | `POST /auth/login` |

## 3.2 Organização do código

```
src/
├── main.tsx            # bootstrap: Router + provedores de sessão e notificação
├── App.tsx             # mapa de rotas e proteção por papel
├── paginas/            # uma pasta de telas, uma tela por arquivo
├── componentes/
│   ├── Layout.tsx              # cabeçalho, navegação, barra inferior, rodapé
│   ├── Basicos.tsx             # Botao, Selo, Estrelas, Avatar, Indicador, Aviso…
│   ├── CartaoProfissional.tsx  # resultado da busca
│   ├── FiltrosBusca.tsx        # abas de serviço + filtros
│   ├── MapaProfissionais.tsx   # mapa esquemático por coordenadas
│   ├── CartaoAgendamento.tsx   # cartão com as ações válidas por papel
│   ├── Modal.tsx               # diálogo acessível (Esc, clique fora, foco)
│   ├── ModalAgendamento.tsx    # formulário de solicitação de cuidado
│   └── ModalAvaliacao.tsx      # avaliação em estrelas
├── contexto/           # SessaoContexto (usuário autenticado) e NotificacaoContexto
├── hooks/useRecurso.ts # carregamento de dados com estado de carregando/erro
├── servicos/api.ts     # cliente HTTP tipado (único ponto que chama fetch)
├── tipos/index.ts      # contratos TypeScript espelhando a API
├── utils/formato.ts    # moeda, datas, status, iniciais
└── estilos/            # tokens.css · base.css · componentes.css
```

Três regras sustentam a organização:

1. **Nenhum `fetch` fora de `servicos/api.ts`** — trocar a URL base ou o cabeçalho de
   autenticação é uma mudança de um arquivo;
2. **Nenhuma cor literal nos componentes** — só `var(--token)`, o que dá tema claro e
   escuro de graça;
3. **Páginas orquestram, componentes apresentam** — componentes não chamam a API.

## 3.3 Estado e carregamento de dados

Sem biblioteca de estado global: a PoC precisa de duas coisas apenas.

```tsx
// sessão: token em localStorage, revalidado em /auth/eu quando o app abre
const { usuario, entrar, sair } = useSessao();

// dados: estado de carregando/erro e recarga sob demanda
const busca = useRecurso(() => api.buscarPrestadores(filtros), [filtros]);
//    busca.dados · busca.carregando · busca.erro · busca.recarregar()
```

[`useRecurso`](../frontend/src/hooks/useRecurso.ts) resolve o padrão repetitivo de
“carregando → dados | erro” e permite recarregar depois de uma escrita (por exemplo, a
lista de agendamentos após uma avaliação).

## 3.4 Design system

Os *tokens* em [`estilos/tokens.css`](../frontend/src/estilos/tokens.css) foram extraídos
do CSS do protótipo aprovado, preservando a identidade visual:

| Token | Valor | Uso |
|---|---|---|
| `--principal` | `oklch(48% 0.105 166)` | verde institucional: ações primárias |
| `--principal-claro` | `oklch(94.8% 0.026 162)` | fundo de selos e cartões em destaque |
| `--terracota` | `oklch(63% 0.12 36)` | marcação do tutor no mapa |
| `--mel` | `oklch(77% 0.155 78)` | estrelas e avisos de atenção |
| `--tinta` / `--tinta-suave` | `oklch(28% …)` / `oklch(56% …)` | texto e texto secundário |
| `--raio` · `--raio-pilula` | `16px` · `999px` | cartões e botões |
| `--sombra-suave` · `--sombra-media` | — | elevação dos cartões |

Tipografia: **Manrope** nos títulos e **DM Sans** no texto — as mesmas do protótipo.
A paleta é declarada em `oklch`, o que permite derivar variações com `color-mix()` sem
criar tokens novos. O modo escuro redefine os mesmos tokens em
`@media (prefers-color-scheme: dark)`.

## 3.5 Responsividade

Uma única folha de estilos, três pontos de quebra:

| Largura | Comportamento |
|---|---|
| < 560px | coluna única, barra de navegação inferior fixa, filtros empilhados |
| ≥ 860px | grades de 2–3 colunas, localização no cabeçalho, lista de conversas ao lado do bate-papo |
| ≥ 1024px | navegação completa no topo (a barra inferior desaparece) |

## 3.6 Acessibilidade

- hierarquia de cabeçalhos coerente (um `h1` por tela) e marcos semânticos
  (`header`, `main`, `nav`, `footer`);
- navegação por teclado em todos os controles, com `:focus-visible` sempre visível;
- `aria-pressed` nos filtros alternáveis, `aria-selected` nas abas, `aria-current` na
  navegação, `role="radiogroup"` na avaliação em estrelas;
- modal com `role="dialog"`, `aria-modal`, fechamento por `Esc` e por clique no fundo,
  com rolagem do fundo travada;
- avisos com `role="alert"` / `role="status"` para serem anunciados por leitores de tela;
- `@media (prefers-reduced-motion)` desliga animações;
- contraste de texto conferido contra os fundos claros e escuros.

## 3.7 Tratamento de erro na interface

Toda falha da API chega ao componente como `ErroApi`, com mensagem em português e,
quando houver, os problemas por campo:

```tsx
try {
  await api.criarAgendamento(dados);
} catch (falha) {
  if (falha instanceof ErroApi) {
    setErro(falha.message);        // "O profissional já tem um atendimento nesse horário."
    setDetalhes(falha.detalhes);   // { inicioEm: "Escolha uma data e hora no futuro." }
  }
}
```

Casos cobertos na interface: lista vazia (com atalho para limpar filtros), erro de rede,
sessão expirada (volta para a tela de entrada), conflito de horário, profissional sem
verificação (botão *Escolher* desabilitado com explicação no `title`) e avaliação
duplicada.

## 3.8 Verificação

```bash
cd frontend
npm run typecheck    # TypeScript estrito, sem erros
npm run build        # typecheck + build de produção
```

O build de produção fica em ~237 kB de JavaScript (73 kB comprimido) e ~22 kB de CSS.
