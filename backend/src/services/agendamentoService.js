import AppError from '../utils/AppError.js';
import { validate, rules } from '../utils/validate.js';
import { gerarCodigo } from '../utils/crypto.js';
import { agoraIso, adicionarMinutos, intervalosSobrepostos, mesAtualIso, isoLocal } from '../utils/datas.js';
import { getDatabase } from '../database/connection.js';
import agendamentoRepository from '../repositories/agendamentoRepository.js';
import prestadorRepository from '../repositories/prestadorRepository.js';
import petRepository from '../repositories/petRepository.js';
import avaliacaoRepository from '../repositories/avaliacaoRepository.js';
import conversaRepository from '../repositories/conversaRepository.js';
import prestadorService from './prestadorService.js';

/**
 * Transições de status permitidas e quem pode executá-las.
 * É a regra de negócio central do ciclo de vida de um cuidado.
 */
const TRANSICOES = {
  solicitado: {
    confirmado: ['prestador'],
    cancelado: ['tutor', 'prestador'],
  },
  confirmado: {
    em_andamento: ['prestador'],
    cancelado: ['tutor', 'prestador'],
  },
  em_andamento: {
    concluido: ['prestador'],
  },
  concluido: {},
  cancelado: {},
};

const DURACOES_PERMITIDAS = [30, 60, 90, 120, 240];

const ehDonoDoAgendamento = (agendamento, usuario) => {
  if (usuario.papel === 'tutor') return agendamento.tutor.id === usuario.id;
  if (usuario.papel === 'prestador') return agendamento.prestador.usuarioId === usuario.id;
  return false;
};

export const agendamentoService = {
  /**
   * Cria um novo cuidado (passo final da jornada "agendar um passeio").
   * Regras aplicadas:
   *   1. o pet precisa pertencer ao tutor autenticado;
   *   2. o profissional precisa estar com a verificação em dia;
   *   3. a data/hora precisa ser futura;
   *   4. o profissional não pode ter outro atendimento no mesmo intervalo;
   *   5. o valor é calculado a partir do preço-base e da duração escolhida;
   *   6. uma conversa é aberta automaticamente para tutor e profissional.
   */
  criar(usuario, dados) {
    if (usuario.papel !== 'tutor') {
      throw AppError.forbidden('Apenas tutores podem solicitar um cuidado.');
    }

    validate(dados, {
      petId: [rules.required('Pet'), rules.integer('Pet', { min: 1 })],
      prestadorId: [rules.required('Profissional'), rules.integer('Profissional', { min: 1 })],
      inicioEm: [rules.required('Data e hora'), rules.isoDateTime('Data e hora')],
      duracaoMinutos: [rules.integer('Duração', { min: 15, max: 480 })],
      titulo: [rules.string('Título', { min: 3, max: 120 })],
      observacoes: [rules.string('Observações', { min: 1, max: 500 })],
      localEncontro: [rules.string('Local de encontro', { min: 3, max: 160 })],
    });

    const pet = petRepository.buscarPorId(Number(dados.petId));
    if (!pet) throw AppError.notFound('Pet não encontrado.');
    if (pet.tutorId !== usuario.id) {
      throw AppError.forbidden('Este pet não pertence ao seu cadastro.');
    }

    const prestador = prestadorRepository.buscarPorId(Number(dados.prestadorId));
    if (!prestador) throw AppError.notFound('Profissional não encontrado.');
    if (prestador.verificacao.status !== 'verificado') {
      const motivo =
        prestador.verificacao.status === 'revogado'
          ? 'teve a verificação revogada pela clínica'
          : 'está com a verificação pendente';
      throw AppError.conflict(
        `Este profissional ${motivo} e não pode receber agendamentos.`,
        { verificacao: prestador.verificacao.status },
      );
    }

    const duracaoMinutos = Number(dados.duracaoMinutos ?? prestador.duracaoMinutos);
    if (!DURACOES_PERMITIDAS.includes(duracaoMinutos)) {
      throw AppError.badRequest(
        `Duração inválida. Opções disponíveis: ${DURACOES_PERMITIDAS.join(', ')} minutos.`,
      );
    }

    const inicioEm = isoLocal(new Date(dados.inicioEm));
    if (inicioEm <= agoraIso()) {
      throw AppError.badRequest('Escolha uma data e hora no futuro.');
    }

    const fimEm = adicionarMinutos(inicioEm, duracaoMinutos);
    const conflitos = agendamentoRepository
      .listarPorPrestador(prestador.id, { status: 'ativos' })
      .filter((existente) =>
        intervalosSobrepostos(
          inicioEm,
          fimEm,
          existente.inicioEm,
          adicionarMinutos(existente.inicioEm, existente.duracaoMinutos),
        ),
      );

    if (conflitos.length > 0) {
      throw AppError.conflict('O profissional já tem um atendimento nesse horário.', {
        conflitoCom: conflitos[0].codigo,
        inicioEm: conflitos[0].inicioEm,
      });
    }

    const valorCentavos = Math.round(
      (prestador.precoCentavos * duracaoMinutos) / prestador.duracaoMinutos,
    );

    const titulo =
      dados.titulo?.trim() || `${prestador.servico.nome} ${pet.sexo === 'macho' ? 'do' : 'da'} ${pet.nome}`;

    // O serviço do agendamento é sempre o que o profissional oferece.
    const servicoId = getDatabase()
      .prepare('SELECT servico_id FROM prestadores WHERE id = ?')
      .get(prestador.id).servico_id;

    const criarTudo = getDatabase().transaction(() => {
      const agendamento = agendamentoRepository.criar({
        codigo: gerarCodigo(),
        tutorId: usuario.id,
        petId: pet.id,
        prestadorId: prestador.id,
        servicoId,
        titulo,
        inicioEm,
        duracaoMinutos,
        valorCentavos,
        status: 'solicitado',
        localEncontro: dados.localEncontro?.trim() ?? null,
        observacoes: dados.observacoes?.trim() ?? null,
      });

      // Conversa aberta na criação: é o que faz a tela de Mensagens sair do
      // estado vazio ("as conversas ficam disponíveis depois de um agendamento").
      const conversaId = conversaRepository.criar({
        agendamentoId: agendamento.id,
        tutorId: usuario.id,
        prestadorId: prestador.id,
      });

      if (dados.observacoes?.trim()) {
        conversaRepository.criarMensagem({
          conversaId,
          autorId: usuario.id,
          conteudo: dados.observacoes.trim(),
        });
      }

      return agendamentoRepository.buscarPorId(agendamento.id);
    });

    return criarTudo();
  },

  listarDoUsuario(usuario, filtros = {}) {
    if (usuario.papel === 'tutor') {
      return agendamentoRepository.listarPorTutor(usuario.id, {
        status: filtros.status,
        petId: filtros.petId ? Number(filtros.petId) : undefined,
      });
    }

    if (usuario.papel === 'prestador') {
      const prestador = prestadorRepository.buscarPorUsuarioId(usuario.id);
      if (!prestador) return [];
      return agendamentoRepository.listarPorPrestador(prestador.id, { status: filtros.status });
    }

    throw AppError.forbidden('Perfil sem agendamentos próprios.');
  },

  detalhar(usuario, id) {
    const agendamento = agendamentoRepository.buscarPorId(Number(id));
    if (!agendamento) throw AppError.notFound('Agendamento não encontrado.');
    if (!ehDonoDoAgendamento(agendamento, usuario)) {
      throw AppError.forbidden('Este agendamento não faz parte do seu histórico.');
    }
    return agendamento;
  },

  alterarStatus(usuario, id, novoStatus, motivo) {
    const agendamento = this.detalhar(usuario, id);
    const permitidos = TRANSICOES[agendamento.status] ?? {};
    const papeisPermitidos = permitidos[novoStatus];

    if (!papeisPermitidos) {
      throw AppError.conflict(
        `Não é possível mudar de "${agendamento.status}" para "${novoStatus}".`,
        { statusAtual: agendamento.status, transicoesPossiveis: Object.keys(permitidos) },
      );
    }
    if (!papeisPermitidos.includes(usuario.papel)) {
      throw AppError.forbidden(
        `Somente o perfil ${papeisPermitidos.join(' ou ')} pode aplicar o status "${novoStatus}".`,
      );
    }

    return agendamentoRepository.atualizarStatus(agendamento.id, novoStatus, {
      concluidoEm: novoStatus === 'concluido' ? agoraIso() : null,
      canceladoMotivo: novoStatus === 'cancelado' ? (motivo ?? 'Cancelado pelo usuário.') : null,
    });
  },

  /** Avaliação do tutor ao fim do cuidado — fecha o ciclo da jornada. */
  avaliar(usuario, id, { nota, comentario }) {
    validate({ nota, comentario }, {
      nota: [rules.required('Nota'), rules.integer('Nota', { min: 1, max: 5 })],
      comentario: [rules.string('Comentário', { min: 1, max: 500 })],
    });

    const agendamento = this.detalhar(usuario, id);
    if (usuario.papel !== 'tutor') {
      throw AppError.forbidden('Somente o tutor avalia o atendimento.');
    }
    if (agendamento.status !== 'concluido') {
      throw AppError.conflict('Só é possível avaliar um cuidado já concluído.');
    }
    if (avaliacaoRepository.buscarPorAgendamento(agendamento.id)) {
      throw AppError.conflict('Este cuidado já foi avaliado.');
    }

    const prestador = prestadorRepository.buscarPorId(agendamento.prestador.id);

    const transacao = getDatabase().transaction(() => {
      const avaliacao = avaliacaoRepository.criar({
        agendamentoId: agendamento.id,
        autorId: usuario.id,
        prestadorId: prestador.id,
        nota: Number(nota),
        comentario,
      });
      const prestadorAtualizado = prestadorService.registrarNovaNota(prestador, Number(nota));
      return { avaliacao, prestador: prestadorAtualizado };
    });

    return transacao();
  },

  /**
   * Visão "Agenda do prestador": indicadores do mês + próximos atendimentos.
   * Todos os números vêm de consultas SQL sobre os agendamentos.
   */
  agendaDoPrestador(usuario) {
    const prestador = prestadorRepository.buscarPorUsuarioId(usuario.id);
    if (!prestador) throw AppError.forbidden('Esta área é exclusiva de prestadores.');

    const estatisticas = agendamentoRepository.estatisticasDoPrestador(prestador.id, mesAtualIso());
    const proximos = agendamentoRepository.listarPorPrestador(prestador.id, {
      status: 'ativos',
      apartirDe: agoraIso(),
    });
    const historico = agendamentoRepository
      .listarPorPrestador(prestador.id, { status: 'concluido' })
      .slice(0, 10);

    return {
      prestador,
      indicadores: {
        naAgenda: estatisticas.naAgenda,
        atendimentosNoMes: estatisticas.concluidosNoMes,
        recebidoNoMesCentavos: estatisticas.recebidoNoMesCentavos,
        avaliacaoMedia: prestador.avaliacaoMedia,
      },
      proximos,
      historico,
    };
  },

  TRANSICOES,
  DURACOES_PERMITIDAS,
};

export default agendamentoService;
