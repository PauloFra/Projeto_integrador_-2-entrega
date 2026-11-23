import { Router } from 'express';
import { exigirAutenticacao, exigirPapel, autenticacaoOpcional } from '../middlewares/auth.js';
import authController from '../controllers/authController.js';
import prestadorController from '../controllers/prestadorController.js';
import petController from '../controllers/petController.js';
import agendamentoController from '../controllers/agendamentoController.js';
import conversaController from '../controllers/conversaController.js';
import clinicaController from '../controllers/clinicaController.js';

const rotas = Router();

// ---------------------------------------------------------------------------
// Saúde da API e catálogo público
// ---------------------------------------------------------------------------
rotas.get('/health', (_req, res) => {
  res.json({ status: 'ok', servico: 'patas-conectadas-api', horario: new Date().toISOString() });
});

rotas.get('/servicos', prestadorController.listarServicos);

// ---------------------------------------------------------------------------
// Autenticação
// ---------------------------------------------------------------------------
rotas.post('/auth/login', authController.login);
rotas.get('/auth/eu', exigirAutenticacao, authController.eu);

// ---------------------------------------------------------------------------
// Busca de profissionais
// A autenticação é opcional: sem login a busca funciona, apenas sem o
// cálculo de distância a partir do endereço do tutor.
// ---------------------------------------------------------------------------
rotas.get('/prestadores', autenticacaoOpcional, prestadorController.listar);
rotas.patch(
  '/prestadores/disponibilidade',
  exigirAutenticacao,
  exigirPapel('prestador'),
  prestadorController.alterarDisponibilidade,
);
rotas.get('/prestadores/:id', autenticacaoOpcional, prestadorController.detalhar);

// ---------------------------------------------------------------------------
// Pets e carteira de saúde
// ---------------------------------------------------------------------------
rotas.get('/pets', exigirAutenticacao, exigirPapel('tutor'), petController.listar);
rotas.post('/pets', exigirAutenticacao, exigirPapel('tutor'), petController.criar);
rotas.get('/pets/:id', exigirAutenticacao, petController.detalhar);
rotas.patch('/pets/:id', exigirAutenticacao, exigirPapel('tutor'), petController.atualizar);
rotas.post(
  '/pets/:id/saude',
  exigirAutenticacao,
  exigirPapel('tutor'),
  petController.adicionarRegistroSaude,
);

// ---------------------------------------------------------------------------
// Agendamentos (passeios e demais cuidados)
// ---------------------------------------------------------------------------
rotas.get('/agendamentos', exigirAutenticacao, agendamentoController.listar);
rotas.post(
  '/agendamentos',
  exigirAutenticacao,
  exigirPapel('tutor'),
  agendamentoController.criar,
);
rotas.get('/agendamentos/:id', exigirAutenticacao, agendamentoController.detalhar);
rotas.patch('/agendamentos/:id/status', exigirAutenticacao, agendamentoController.alterarStatus);
rotas.post(
  '/agendamentos/:id/avaliacao',
  exigirAutenticacao,
  exigirPapel('tutor'),
  agendamentoController.avaliar,
);

// ---------------------------------------------------------------------------
// Área do prestador
// ---------------------------------------------------------------------------
rotas.get(
  '/prestador/agenda',
  exigirAutenticacao,
  exigirPapel('prestador'),
  agendamentoController.agendaDoPrestador,
);

// ---------------------------------------------------------------------------
// Mensagens
// ---------------------------------------------------------------------------
rotas.get('/conversas', exigirAutenticacao, conversaController.listar);
rotas.get('/conversas/:id', exigirAutenticacao, conversaController.detalhar);
rotas.post('/conversas/:id/mensagens', exigirAutenticacao, conversaController.enviarMensagem);

// ---------------------------------------------------------------------------
// Painel de gestão da clínica
// ---------------------------------------------------------------------------
rotas.get(
  '/clinica/visao-geral',
  exigirAutenticacao,
  exigirPapel('clinica'),
  clinicaController.visaoGeral,
);
rotas.patch(
  '/clinica/profissionais/:id/verificacao',
  exigirAutenticacao,
  exigirPapel('clinica'),
  clinicaController.alterarVerificacao,
);

export default rotas;
