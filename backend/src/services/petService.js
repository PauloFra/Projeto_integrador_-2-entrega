import AppError from '../utils/AppError.js';
import { validate, rules } from '../utils/validate.js';
import { agoraIso, diasAte, somenteData } from '../utils/datas.js';
import petRepository from '../repositories/petRepository.js';
import agendamentoRepository from '../repositories/agendamentoRepository.js';

/**
 * O status gravado é o informado pela clínica/tutor, mas a vigência é
 * recalculada na leitura: se a próxima dose já passou, o item vira "atrasado".
 */
const avaliarVigencia = (registro) => {
  const dias = diasAte(registro.proximaDose);
  let status = registro.status;
  if (dias !== null && dias < 0) status = 'atrasado';
  return { ...registro, diasParaProximaDose: dias, status };
};

const garantirDono = (pet, usuario) => {
  if (!pet) throw AppError.notFound('Pet não encontrado.');
  if (usuario.papel === 'tutor' && pet.tutorId !== usuario.id) {
    throw AppError.forbidden('Este pet não pertence ao seu cadastro.');
  }
};

export const petService = {
  listarDoTutor(usuario) {
    if (usuario.papel !== 'tutor') {
      throw AppError.forbidden('Somente tutores possuem pets cadastrados.');
    }
    return petRepository.listarPorTutor(usuario.id);
  },

  /** Monta a página "O cantinho do pet": perfil + saúde + histórico + próximo cuidado. */
  detalhar(usuario, id) {
    const pet = petRepository.buscarPorId(Number(id));
    garantirDono(pet, usuario);

    const registros = petRepository.listarRegistrosSaude(pet.id).map(avaliarVigencia);
    const consultas = petRepository.listarConsultas(pet.id);
    const agendamentos = agendamentoRepository.listarPorPet(pet.id);

    // Histórico unificado: cuidados concluídos + consultas já realizadas.
    const historico = [
      ...agendamentos
        .filter((item) => item.status === 'concluido')
        .map((item) => ({
          tipo: 'cuidado',
          titulo: `${item.servico.nome} com ${item.prestador.nome}`,
          quando: item.inicioEm,
          detalhe: `${item.duracaoMinutos} min`,
          nota: item.avaliacao?.nota ?? null,
          status: 'Concluído',
        })),
      ...consultas
        .filter((consulta) => consulta.status === 'realizada')
        .map((consulta) => ({
          tipo: 'consulta',
          titulo: `${consulta.titulo} — ${consulta.clinicaNome}`,
          quando: consulta.inicioEm,
          detalhe: consulta.veterinarioNome,
          nota: null,
          status: 'Concluído',
        })),
    ].sort((a, b) => (a.quando < b.quando ? 1 : -1));

    return {
      ...pet,
      saude: {
        registros,
        emDia: registros.every((registro) => registro.status !== 'atrasado'),
        notas: petRepository.listarNotasVeterinarias(pet.id),
      },
      historico,
      proximaConsulta: petRepository.buscarProximaConsulta(pet.id, agoraIso()),
      proximoCuidado:
        agendamentos
          .filter((item) => ['solicitado', 'confirmado', 'em_andamento'].includes(item.status))
          .filter((item) => item.inicioEm >= agoraIso())
          .sort((a, b) => (a.inicioEm > b.inicioEm ? 1 : -1))[0] ?? null,
    };
  },

  criar(usuario, dados) {
    if (usuario.papel !== 'tutor') {
      throw AppError.forbidden('Somente tutores podem cadastrar pets.');
    }

    validate(dados, {
      nome: [rules.required('Nome'), rules.string('Nome', { min: 2, max: 60 })],
      raca: [rules.string('Raça', { min: 2, max: 60 })],
      sexo: [rules.oneOf('Sexo', ['femea', 'macho'])],
      idadeAnos: [rules.integer('Idade', { min: 0, max: 30 })],
      pesoKg: [rules.number('Peso', { min: 0.3, max: 120 })],
      porte: [rules.oneOf('Porte', ['pequeno', 'medio', 'grande'])],
      sobre: [rules.string('Sobre', { min: 1, max: 600 })],
    });

    return petRepository.criar({
      tutorId: usuario.id,
      nome: dados.nome.trim(),
      especie: dados.especie ?? 'cachorro',
      raca: dados.raca ?? null,
      sexo: dados.sexo ?? null,
      idadeAnos: dados.idadeAnos === undefined ? null : Number(dados.idadeAnos),
      pesoKg: dados.pesoKg === undefined ? null : Number(dados.pesoKg),
      porte: dados.porte ?? null,
      castrado: Number(Boolean(dados.castrado)),
      microchipado: Number(Boolean(dados.microchipado)),
      sociavel: dados.sociavel === undefined ? 1 : Number(Boolean(dados.sociavel)),
      sobre: dados.sobre ?? null,
      fotoUrl: dados.fotoUrl ?? null,
    });
  },

  atualizar(usuario, id, dados) {
    const pet = petRepository.buscarPorId(Number(id));
    garantirDono(pet, usuario);

    validate(dados, {
      nome: [rules.string('Nome', { min: 2, max: 60 })],
      sexo: [rules.oneOf('Sexo', ['femea', 'macho'])],
      porte: [rules.oneOf('Porte', ['pequeno', 'medio', 'grande'])],
      pesoKg: [rules.number('Peso', { min: 0.3, max: 120 })],
      idadeAnos: [rules.integer('Idade', { min: 0, max: 30 })],
      sobre: [rules.string('Sobre', { min: 1, max: 600 })],
    });

    return petRepository.atualizar(pet.id, dados);
  },

  /** Novo item na carteira de saúde (vacina, vermífugo, antipulgas…). */
  adicionarRegistroSaude(usuario, id, dados) {
    const pet = petRepository.buscarPorId(Number(id));
    garantirDono(pet, usuario);

    validate(dados, {
      tipo: [
        rules.required('Tipo'),
        rules.oneOf('Tipo', ['vacina', 'vermifugo', 'antipulgas', 'exame', 'consulta']),
      ],
      nome: [rules.required('Nome'), rules.string('Nome', { min: 2, max: 120 })],
      aplicadoEm: [rules.required('Data de aplicação'), rules.isoDateTime('Data de aplicação')],
      proximaDose: [rules.isoDateTime('Próxima dose')],
      observacao: [rules.string('Observação', { min: 1, max: 300 })],
    });

    const registro = petRepository.criarRegistroSaude({
      petId: pet.id,
      tipo: dados.tipo,
      nome: dados.nome.trim(),
      aplicadoEm: somenteData(dados.aplicadoEm),
      proximaDose: dados.proximaDose ? somenteData(dados.proximaDose) : null,
      status: dados.tipo === 'antipulgas' ? 'protegida' : 'em_dia',
      observacao: dados.observacao ?? null,
    });

    return avaliarVigencia(registro);
  },
};

export default petService;
