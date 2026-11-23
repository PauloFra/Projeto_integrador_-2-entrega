/**
 * Testes de integração da API (executa contra um banco SQLite separado).
 *
 * Rodar:  npm test        (dentro de backend/)
 *
 * O arquivo usa apenas o test runner nativo do Node (node:test) — sem
 * dependências adicionais de teste no projeto.
 */
import test, { before, after, describe } from 'node:test';
import assert from 'node:assert/strict';

// Importante: o ambiente precisa ser configurado ANTES de carregar os módulos
// que leem a configuração, por isso os imports abaixo são dinâmicos.
process.env.NODE_ENV = 'test';
process.env.DATABASE_FILE = './data/test.db';

const { criarApp } = await import('../src/app.js');
const { reset } = await import('../src/database/reset.js');
const { closeDatabase } = await import('../src/database/connection.js');

let servidor;
let base;

const req = async (caminho, { metodo = 'GET', token, corpo } = {}) => {
  const resposta = await fetch(`${base}${caminho}`, {
    method: metodo,
    headers: {
      ...(corpo ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await resposta.text();
  return { status: resposta.status, corpo: texto ? JSON.parse(texto) : null };
};

const entrar = async (email) => {
  const { corpo } = await req('/auth/login', {
    metodo: 'POST',
    corpo: { email, senha: 'patas123' },
  });
  return corpo.token;
};

/** Data futura segura para os testes de agendamento (sempre livre na agenda). */
const dataFutura = (diasAfrente, hora) => {
  const d = new Date();
  d.setDate(d.getDate() + diasAfrente);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hora)}:00:00`;
};

before(() => {
  reset();
  const app = criarApp();
  servidor = app.listen(0);
  base = `http://127.0.0.1:${servidor.address().port}/api`;
});

after(() => {
  servidor?.close();
  closeDatabase();
});

describe('saúde e catálogo', () => {
  test('GET /api/health responde ok', async () => {
    const { status, corpo } = await req('/health');
    assert.equal(status, 200);
    assert.equal(corpo.status, 'ok');
  });

  test('GET /api/servicos devolve os 4 serviços do catálogo', async () => {
    const { status, corpo } = await req('/servicos');
    assert.equal(status, 200);
    assert.equal(corpo.servicos.length, 4);
    assert.deepEqual(
      corpo.servicos.map((s) => s.slug),
      ['passeio', 'pet-sitter', 'banho-tosa', 'veterinario'],
    );
  });
});

describe('autenticação', () => {
  test('senha incorreta devolve 401', async () => {
    const { status } = await req('/auth/login', {
      metodo: 'POST',
      corpo: { email: 'camila@patasconectadas.app', senha: 'errada' },
    });
    assert.equal(status, 401);
  });

  test('login válido devolve token e perfil de tutora', async () => {
    const { status, corpo } = await req('/auth/login', {
      metodo: 'POST',
      corpo: { email: 'camila@patasconectadas.app', senha: 'patas123' },
    });
    assert.equal(status, 200);
    assert.ok(corpo.token);
    assert.equal(corpo.usuario.papel, 'tutor');
    assert.equal(corpo.usuario.nome, 'Camila Andrade');
  });

  test('rota protegida sem token devolve 401', async () => {
    const { status } = await req('/pets');
    assert.equal(status, 401);
  });

  test('prestador não acessa o painel da clínica', async () => {
    const token = await entrar('roberto@patasconectadas.app');
    const { status } = await req('/clinica/visao-geral', { token });
    assert.equal(status, 403);
  });
});

describe('busca de profissionais (jornada principal)', () => {
  test('filtra por serviço e calcula a distância a partir do endereço da tutora', async () => {
    const token = await entrar('camila@patasconectadas.app');
    const { status, corpo } = await req('/prestadores?servico=passeio', { token });

    assert.equal(status, 200);
    assert.equal(corpo.total, 3);
    assert.deepEqual(
      corpo.prestadores.map((p) => p.distanciaKm),
      [0.8, 1.2, 1.6],
      'resultado deve vir ordenado do mais perto para o mais longe',
    );
  });

  test('filtro de raio reduz o resultado', async () => {
    const token = await entrar('camila@patasconectadas.app');
    const { corpo } = await req('/prestadores?servico=passeio&raioKm=1', { token });
    assert.equal(corpo.total, 1);
    assert.equal(corpo.prestadores[0].nome, 'Roberto Neves');
  });

  test('filtro de preço máximo considera centavos', async () => {
    const token = await entrar('camila@patasconectadas.app');
    const { corpo } = await req('/prestadores?servico=passeio&precoMaximo=30', { token });
    assert.equal(corpo.total, 1);
    assert.equal(corpo.prestadores[0].nome, 'Lucas Ferreira');
  });

  test('serviço inexistente devolve 400', async () => {
    const { status } = await req('/prestadores?servico=astronauta');
    assert.equal(status, 400);
  });
});

describe('carteira de saúde do pet', () => {
  test('perfil da Luna traz saúde em dia, histórico e próxima consulta', async () => {
    const token = await entrar('camila@patasconectadas.app');
    const { status, corpo } = await req('/pets/1', { token });

    assert.equal(status, 200);
    assert.equal(corpo.nome, 'Luna');
    assert.equal(corpo.saude.registros.length, 4);
    assert.equal(corpo.saude.emDia, true);
    assert.ok(corpo.saude.notas.length >= 1);
    assert.ok(corpo.historico.length >= 2);
    assert.equal(corpo.proximaConsulta.titulo, 'Check-up da Luna');
  });

  test('tutora não acessa pet de outra pessoa', async () => {
    const token = await entrar('camila@patasconectadas.app');
    const { status } = await req('/pets/2', { token });
    assert.equal(status, 403);
  });

  test('novo registro de saúde entra na carteira', async () => {
    const token = await entrar('camila@patasconectadas.app');
    const { status, corpo } = await req('/pets/1/saude', {
      metodo: 'POST',
      token,
      corpo: {
        tipo: 'vacina',
        nome: 'Vacina da gripe canina',
        aplicadoEm: dataFutura(-1, 10),
        proximaDose: dataFutura(365, 10),
      },
    });

    assert.equal(status, 201);
    assert.equal(corpo.nome, 'Vacina da gripe canina');
    assert.equal(corpo.status, 'em_dia');
  });
});

describe('ciclo de vida de um agendamento', () => {
  let agendamentoId;

  test('tutora agenda um passeio de 60 min e o valor é proporcional', async () => {
    const token = await entrar('camila@patasconectadas.app');
    const { status, corpo } = await req('/agendamentos', {
      metodo: 'POST',
      token,
      corpo: {
        petId: 1,
        prestadorId: 1,
        inicioEm: dataFutura(4, 15),
        duracaoMinutos: 60,
        observacoes: 'A Luna puxa um pouco no começo.',
      },
    });

    assert.equal(status, 201);
    assert.equal(corpo.status, 'solicitado');
    assert.equal(corpo.valorCentavos, 7000, 'R$ 35 por 30 min => R$ 70 por 60 min');
    assert.equal(corpo.titulo, 'Passeio da Luna');
    assert.ok(corpo.conversaId, 'o agendamento deve abrir uma conversa');
    agendamentoId = corpo.id;
  });

  test('a conversa criada aparece na lista de mensagens da tutora', async () => {
    const token = await entrar('camila@patasconectadas.app');
    const { corpo } = await req('/conversas', { token });
    assert.equal(corpo.conversas.length, 1);
    assert.equal(corpo.conversas[0].contraparte.nome, 'Roberto Neves');
    assert.match(corpo.conversas[0].ultimaMensagem, /puxa um pouco/);
  });

  test('o profissional responde na conversa', async () => {
    const tokenPrestador = await entrar('roberto@patasconectadas.app');
    const { corpo: lista } = await req('/conversas', { token: tokenPrestador });
    const conversa = lista.conversas.find((c) => c.agendamento.id === agendamentoId);

    const { status, corpo } = await req(`/conversas/${conversa.id}/mensagens`, {
      metodo: 'POST',
      token: tokenPrestador,
      corpo: { conteudo: 'Combinado! Levo a guia peitoral.' },
    });

    assert.equal(status, 201);
    assert.equal(corpo.autorNome, 'Roberto Neves');
  });

  test('horário sobreposto é rejeitado com 409', async () => {
    const token = await entrar('camila@patasconectadas.app');
    const { status, corpo } = await req('/agendamentos', {
      metodo: 'POST',
      token,
      corpo: { petId: 1, prestadorId: 1, inicioEm: dataFutura(4, 15), duracaoMinutos: 30 },
    });

    assert.equal(status, 409);
    assert.match(corpo.erro, /já tem um atendimento/);
  });

  test('data no passado é rejeitada com 400', async () => {
    const token = await entrar('camila@patasconectadas.app');
    const { status } = await req('/agendamentos', {
      metodo: 'POST',
      token,
      corpo: { petId: 1, prestadorId: 1, inicioEm: dataFutura(-2, 10) },
    });
    assert.equal(status, 400);
  });

  test('a tutora não pode confirmar em nome do profissional', async () => {
    const token = await entrar('camila@patasconectadas.app');
    const { status } = await req(`/agendamentos/${agendamentoId}/status`, {
      metodo: 'PATCH',
      token,
      corpo: { status: 'confirmado' },
    });
    assert.equal(status, 403);
  });

  test('o profissional conduz o cuidado até a conclusão', async () => {
    const token = await entrar('roberto@patasconectadas.app');

    for (const status of ['confirmado', 'em_andamento', 'concluido']) {
      const resposta = await req(`/agendamentos/${agendamentoId}/status`, {
        metodo: 'PATCH',
        token,
        corpo: { status },
      });
      assert.equal(resposta.status, 200);
      assert.equal(resposta.corpo.status, status);
    }
  });

  test('transição inválida devolve 409', async () => {
    const token = await entrar('roberto@patasconectadas.app');
    const { status } = await req(`/agendamentos/${agendamentoId}/status`, {
      metodo: 'PATCH',
      token,
      corpo: { status: 'confirmado' },
    });
    assert.equal(status, 409);
  });

  test('a avaliação da tutora recalcula a média do profissional', async () => {
    const token = await entrar('camila@patasconectadas.app');
    const { status, corpo } = await req(`/agendamentos/${agendamentoId}/avaliacao`, {
      metodo: 'POST',
      token,
      corpo: { nota: 4, comentario: 'Mandou fotos do trajeto todo.' },
    });

    assert.equal(status, 201);
    assert.equal(corpo.avaliacao.nota, 4);
    assert.equal(corpo.prestador.avaliacoesTotal, 129);
    assert.equal(corpo.prestador.avaliacaoMedia, 4.89, '(4,9 × 128 + 4) / 129 = 4,89');
  });

  test('não é possível avaliar duas vezes', async () => {
    const token = await entrar('camila@patasconectadas.app');
    const { status } = await req(`/agendamentos/${agendamentoId}/avaliacao`, {
      metodo: 'POST',
      token,
      corpo: { nota: 5 },
    });
    assert.equal(status, 409);
  });
});

describe('agenda do prestador', () => {
  test('indicadores do mês vêm do banco (24 passeios × R$ 35 = R$ 840)', async () => {
    const token = await entrar('roberto@patasconectadas.app');
    const { status, corpo } = await req('/prestador/agenda', { token });

    assert.equal(status, 200);
    assert.equal(corpo.indicadores.atendimentosNoMes >= 24, true);
    assert.equal(corpo.indicadores.recebidoNoMesCentavos >= 84000, true);
    assert.ok(corpo.proximos.length >= 2);
  });
});

describe('painel da clínica', () => {
  test('indicadores da rede e documentação dos profissionais', async () => {
    const token = await entrar('clinica@patasconectadas.app');
    const { status, corpo } = await req('/clinica/visao-geral', { token });

    assert.equal(status, 200);
    assert.equal(corpo.indicadores.profissionaisParceiros, 6);
    assert.equal(corpo.indicadores.profissionaisVerificados, 5);
    assert.equal(corpo.indicadores.petsAcompanhados, 32);
    assert.equal(corpo.profissionais.length, 6);
  });

  test('revogar a verificação bloqueia novos agendamentos', async () => {
    const tokenClinica = await entrar('clinica@patasconectadas.app');
    const revogacao = await req('/clinica/profissionais/3/verificacao', {
      metodo: 'PATCH',
      token: tokenClinica,
      corpo: { acao: 'revogar' },
    });
    assert.equal(revogacao.status, 200);
    assert.equal(revogacao.corpo.verificacao.status, 'revogado');

    const tokenTutora = await entrar('camila@patasconectadas.app');
    const tentativa = await req('/agendamentos', {
      metodo: 'POST',
      token: tokenTutora,
      corpo: { petId: 1, prestadorId: 3, inicioEm: dataFutura(6, 11) },
    });
    assert.equal(tentativa.status, 409);
    assert.match(tentativa.corpo.erro, /revogada/);

    // devolve o profissional ao estado original
    const volta = await req('/clinica/profissionais/3/verificacao', {
      metodo: 'PATCH',
      token: tokenClinica,
      corpo: { acao: 'verificar' },
    });
    assert.equal(volta.corpo.verificacao.status, 'verificado');
  });

  test('ação repetida devolve 409', async () => {
    const token = await entrar('clinica@patasconectadas.app');
    const { status } = await req('/clinica/profissionais/3/verificacao', {
      metodo: 'PATCH',
      token,
      corpo: { acao: 'verificar' },
    });
    assert.equal(status, 409);
  });
});

describe('tratamento de erros', () => {
  test('rota inexistente devolve 404 em JSON', async () => {
    const { status, corpo } = await req('/nao-existe');
    assert.equal(status, 404);
    assert.match(corpo.erro, /Rota não encontrada/);
  });

  test('payload inválido devolve 400 com o detalhe por campo', async () => {
    const token = await entrar('camila@patasconectadas.app');
    const { status, corpo } = await req('/agendamentos', {
      metodo: 'POST',
      token,
      corpo: { prestadorId: 1 },
    });

    assert.equal(status, 400);
    assert.ok(corpo.detalhes.petId);
    assert.ok(corpo.detalhes.inicioEm);
  });
});
