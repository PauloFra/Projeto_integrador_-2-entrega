import AppError from '../utils/AppError.js';
import { validate, rules } from '../utils/validate.js';
import { agoraIso, mesAtualIso } from '../utils/datas.js';
import clinicaRepository from '../repositories/clinicaRepository.js';
import prestadorRepository from '../repositories/prestadorRepository.js';
import agendamentoRepository from '../repositories/agendamentoRepository.js';

const garantirClinica = (usuario) => {
  if (usuario.papel !== 'clinica') {
    throw AppError.forbidden('Área exclusiva da gestão da clínica.');
  }
  const clinica = clinicaRepository.buscarPorResponsavel(usuario.id);
  if (!clinica) throw AppError.notFound('Nenhuma clínica vinculada a este usuário.');
  return clinica;
};

export const clinicaService = {
  /**
   * Painel da clínica: indicadores da rede + documentação dos profissionais.
   * Todos os indicadores são calculados por SQL sobre a base real da PoC.
   */
  visaoGeral(usuario) {
    const clinica = garantirClinica(usuario);
    const profissionais = prestadorRepository.listarPorClinica(clinica.id);
    const rede = agendamentoRepository.estatisticasDaRede(clinica.id, mesAtualIso());

    return {
      clinica,
      indicadores: {
        profissionaisParceiros: profissionais.length,
        profissionaisVerificados: profissionais.filter(
          (profissional) => profissional.verificacao.status === 'verificado',
        ).length,
        servicosNoMes: rede.servicosNoMes,
        petsAcompanhados: rede.petsAcompanhados,
      },
      profissionais,
      eventosRecentes: clinicaRepository.listarEventosVerificacao(clinica.id, 10),
    };
  },

  /**
   * Verifica ou revoga a documentação de um profissional.
   * Um profissional revogado deixa de aceitar novos agendamentos
   * (regra aplicada em agendamentoService.criar).
   */
  alterarVerificacao(usuario, prestadorId, dados) {
    const clinica = garantirClinica(usuario);

    validate(dados, {
      acao: [rules.required('Ação'), rules.oneOf('Ação', ['verificar', 'revogar'])],
    });

    const prestador = prestadorRepository.buscarPorId(Number(prestadorId));
    if (!prestador) throw AppError.notFound('Profissional não encontrado.');
    if (prestador.clinicaId !== clinica.id) {
      throw AppError.forbidden('Este profissional não faz parte da sua rede.');
    }

    const statusAnterior = prestador.verificacao.status;
    const statusNovo = dados.acao === 'verificar' ? 'verificado' : 'revogado';
    if (statusAnterior === statusNovo) {
      throw AppError.conflict(`O profissional já está com status "${statusNovo}".`);
    }

    const atualizado = prestadorRepository.atualizarVerificacao(
      prestador.id,
      statusNovo,
      statusNovo === 'verificado' ? agoraIso() : null,
    );

    clinicaRepository.registrarEventoVerificacao({
      prestadorId: prestador.id,
      atorId: usuario.id,
      acao: dados.acao,
      statusAnterior,
      statusNovo,
    });

    return atualizado;
  },
};

export default clinicaService;
