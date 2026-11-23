import AppError from '../utils/AppError.js';
import { validate, rules } from '../utils/validate.js';
import conversaRepository from '../repositories/conversaRepository.js';
import prestadorRepository from '../repositories/prestadorRepository.js';

const participa = (conversa, usuario) =>
  conversa.tutor.id === usuario.id || conversa.prestador.usuarioId === usuario.id;

export const conversaService = {
  listar(usuario) {
    return conversaRepository.listarPorUsuario(usuario.id);
  },

  detalhar(usuario, id) {
    const conversa = conversaRepository.buscarPorId(Number(id), usuario.id);
    if (!conversa) throw AppError.notFound('Conversa não encontrada.');
    if (!participa(conversa, usuario)) {
      throw AppError.forbidden('Você não participa desta conversa.');
    }

    conversaRepository.marcarComoLidas(conversa.id, usuario.id);
    return { ...conversa, naoLidas: 0, mensagens: conversaRepository.listarMensagens(conversa.id) };
  },

  enviarMensagem(usuario, id, dados) {
    validate(dados, {
      conteudo: [rules.required('Mensagem'), rules.string('Mensagem', { min: 1, max: 1000 })],
    });

    const conversa = conversaRepository.buscarPorId(Number(id), usuario.id);
    if (!conversa) throw AppError.notFound('Conversa não encontrada.');
    if (!participa(conversa, usuario)) {
      throw AppError.forbidden('Você não participa desta conversa.');
    }
    if (conversa.agendamento.status === 'cancelado') {
      throw AppError.conflict('A conversa de um cuidado cancelado fica somente como histórico.');
    }

    return conversaRepository.criarMensagem({
      conversaId: conversa.id,
      autorId: usuario.id,
      conteudo: dados.conteudo.trim(),
    });
  },

  /** Total de mensagens não lidas — usado no badge do menu. */
  contarNaoLidas(usuario) {
    return conversaRepository
      .listarPorUsuario(usuario.id)
      .reduce((total, conversa) => total + conversa.naoLidas, 0);
  },

  /** Conversa vinculada a um agendamento (atalho usado após o agendamento). */
  buscarPorAgendamento(usuario, agendamentoId) {
    const conversa = conversaRepository.buscarPorAgendamento(Number(agendamentoId), usuario.id);
    if (!conversa) throw AppError.notFound('Nenhuma conversa aberta para este cuidado.');
    if (!participa(conversa, usuario)) {
      throw AppError.forbidden('Você não participa desta conversa.');
    }
    return conversa;
  },

  prestadorDoUsuario(usuario) {
    return prestadorRepository.buscarPorUsuarioId(usuario.id);
  },
};

export default conversaService;
