import asyncHandler from '../utils/asyncHandler.js';
import prestadorService from '../services/prestadorService.js';
import servicoRepository from '../repositories/servicoRepository.js';

export const prestadorController = {
  /** GET /api/prestadores — busca com filtros da jornada do tutor */
  listar: asyncHandler(async (req, res) => {
    res.json(prestadorService.buscar(req.query, req.usuario));
  }),

  /** GET /api/prestadores/:id */
  detalhar: asyncHandler(async (req, res) => {
    res.json(prestadorService.detalhar(req.params.id, req.usuario));
  }),

  /** PATCH /api/prestadores/disponibilidade — alternar "disponível agora" */
  alterarDisponibilidade: asyncHandler(async (req, res) => {
    const disponivel = req.body?.disponivelAgora;
    res.json(prestadorService.alterarDisponibilidade(req.usuario, Boolean(disponivel)));
  }),

  /** GET /api/servicos — catálogo usado nas abas da busca */
  listarServicos: asyncHandler(async (_req, res) => {
    res.json({ servicos: servicoRepository.listar() });
  }),
};

export default prestadorController;
