import AppError from '../utils/AppError.js';
import { distanceInKm } from '../utils/geo.js';
import prestadorRepository from '../repositories/prestadorRepository.js';
import avaliacaoRepository from '../repositories/avaliacaoRepository.js';
import servicoRepository from '../repositories/servicoRepository.js';

const paraNumero = (valor) => {
  if (valor === undefined || valor === null || valor === '') return undefined;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : undefined;
};

const paraBooleano = (valor) => {
  if (valor === undefined || valor === null || valor === '') return undefined;
  return valor === true || valor === 'true' || valor === '1';
};

export const prestadorService = {
  /**
   * Busca de profissionais — o coração da jornada escolhida para a PoC.
   *
   * Filtros suportados (query string):
   *   servico=passeio            slug do serviço
   *   raioKm=1|2|3|5             distância máxima a partir do tutor
   *   notaMinima=4.8             avaliação mínima
   *   precoMaximo=35             preço máximo em reais
   *   disponivelAgora=true       apenas quem está disponível
   *   termo=mariana              busca textual por nome/especialidade
   *   ordenar=distancia|avaliacao|preco
   */
  buscar(filtros = {}, usuarioLogado = null) {
    const servicoSlug = filtros.servico || undefined;
    if (servicoSlug && !servicoRepository.buscarPorSlug(servicoSlug)) {
      throw AppError.badRequest(`Serviço "${servicoSlug}" não existe no catálogo.`);
    }

    const precoMaximo = paraNumero(filtros.precoMaximo);
    const encontrados = prestadorRepository.listar({
      servicoSlug,
      disponivelAgora: paraBooleano(filtros.disponivelAgora),
      notaMinima: paraNumero(filtros.notaMinima),
      precoMaximoCentavos: precoMaximo === undefined ? undefined : Math.round(precoMaximo * 100),
      termo: filtros.termo ? String(filtros.termo).trim() : undefined,
      apenasVerificados: paraBooleano(filtros.apenasVerificados),
    });

    const origem = usuarioLogado?.coordenada ?? null;
    const raioKm = paraNumero(filtros.raioKm);

    let resultado = encontrados.map((prestador) => ({
      ...prestador,
      distanciaKm: distanceInKm(origem, prestador.coordenada),
    }));

    if (raioKm !== undefined) {
      resultado = resultado.filter(
        (prestador) => prestador.distanciaKm === null || prestador.distanciaKm <= raioKm,
      );
    }

    const ordenar = filtros.ordenar ?? 'distancia';
    const porDistancia = (a, b) =>
      (a.distanciaKm ?? Number.POSITIVE_INFINITY) - (b.distanciaKm ?? Number.POSITIVE_INFINITY);

    if (ordenar === 'distancia') resultado.sort(porDistancia);
    else if (ordenar === 'avaliacao') resultado.sort((a, b) => b.avaliacaoMedia - a.avaliacaoMedia);
    else if (ordenar === 'preco') resultado.sort((a, b) => a.precoCentavos - b.precoCentavos);

    return {
      total: resultado.length,
      filtrosAplicados: {
        servico: servicoSlug ?? null,
        raioKm: raioKm ?? null,
        notaMinima: paraNumero(filtros.notaMinima) ?? null,
        precoMaximo: precoMaximo ?? null,
        disponivelAgora: paraBooleano(filtros.disponivelAgora) ?? null,
        ordenar,
      },
      origem,
      prestadores: resultado,
    };
  },

  detalhar(id, usuarioLogado = null) {
    const prestador = prestadorRepository.buscarPorId(Number(id));
    if (!prestador) throw AppError.notFound('Profissional não encontrado.');

    return {
      ...prestador,
      distanciaKm: distanceInKm(usuarioLogado?.coordenada ?? null, prestador.coordenada),
      avaliacoesRecentes: avaliacaoRepository.listarPorPrestador(prestador.id, 5),
    };
  },

  /** Usada pelo prestador para ligar/desligar o status "disponível agora". */
  alterarDisponibilidade(usuario, disponivel) {
    const prestador = prestadorRepository.buscarPorUsuarioId(usuario.id);
    if (!prestador) throw AppError.forbidden('Apenas prestadores podem alterar a disponibilidade.');
    return prestadorRepository.atualizarDisponibilidade(prestador.id, disponivel);
  },

  /**
   * Recalcula a média do prestador a partir da denormalização existente.
   * Mantém o histórico de avaliações anteriores à PoC sem precisar de 128 registros.
   */
  registrarNovaNota(prestador, nota) {
    const total = prestador.avaliacoesTotal;
    const somaAtual = prestador.avaliacaoMedia * total;
    const novoTotal = total + 1;
    const novaMedia = Number(((somaAtual + nota) / novoTotal).toFixed(2));
    return prestadorRepository.atualizarResumoAvaliacoes(prestador.id, novaMedia, novoTotal);
  },
};

export default prestadorService;
