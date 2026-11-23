# Protótipo estático da 1ª etapa

Esta pasta guarda o **protótipo navegável aprovado na primeira etapa** do Projeto
Integrador, preservado como referência de UX e como registro histórico da evolução
do trabalho.

> ⚠️ **Não é a aplicação da PoC.** São páginas HTML estáticas, com textos e números
> fixos no código. A aplicação funcional (React + API + banco) está em
> [`../frontend/`](../frontend/) e [`../backend/`](../backend/).

## Como abrir

Basta abrir [`index.html`](index.html) no navegador — não há servidor nem build.

## Telas

| Arquivo | Tela | Virou, na PoC |
|---|---|---|
| `index.html` | Início (busca de profissionais) | `frontend/src/paginas/Inicio.tsx` |
| `passeios.html` | Meus passeios | `frontend/src/paginas/MeusPasseios.tsx` |
| `luna.html` | Perfil e saúde da Luna | `frontend/src/paginas/PerfilPet.tsx` |
| `mensagens.html` | Mensagens | `frontend/src/paginas/Mensagens.tsx` |
| `agenda.html` | Agenda do prestador | `frontend/src/paginas/AgendaPrestador.tsx` |
| `gestao.html` | Painel da clínica | `frontend/src/paginas/PainelClinica.tsx` |

O vídeo de demonstração do protótipo está em [`../docs/midia/`](../docs/midia/).

## O que foi aproveitado

| Do protótipo | Para a PoC |
|---|---|
| Paleta (verde-menta, terracota, mel) em `oklch` | *design tokens* em `frontend/src/estilos/tokens.css` |
| Tipografia Manrope + DM Sans | mesmas fontes, carregadas no `index.html` |
| Hierarquia das telas e textos de interface | páginas e componentes React |
| Imagens (Luna, Roberto, Mariana, Lucas) | `frontend/public/imagens/` |
| Números exibidos (0,8 km · R$ 35 · 4,9 · R$ 840 · 48 serviços) | reproduzidos **calculados** a partir do banco pelo `seed.js` |

## Observações

- Os arquivos em `assets/` e `__l5e/` são o resultado do espelhamento do protótipo
  (HTML, CSS, JavaScript e imagens compilados pela ferramenta de prototipação).
- Nenhum arquivo desta pasta é usado em tempo de execução pela aplicação — ela pode ser
  removida sem afetar o funcionamento da PoC.
