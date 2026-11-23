import asyncHandler from '../utils/asyncHandler.js';
import { validate, rules } from '../utils/validate.js';
import agendamentoService from '../services/agendamentoService.js';

export const agendamentoController = {
  /** GET /api/agendamentos?status=ativos|concluido|cancelado */
  listar: asyncHandler(async (req, res) => {
    res.json({ agendamentos: agendamentoService.listarDoUsuario(req.usuario, req.query) });
  }),

  /** POST /api/agendamentos */
  criar: asyncHandler(async (req, res) => {
    res.status(201).json(agendamentoService.criar(req.usuario, req.body));
  }),

  /** GET /api/agendamentos/:id */
  detalhar: asyncHandler(async (req, res) => {
    res.json(agendamentoService.detalhar(req.usuario, req.params.id));
  }),

  /** PATCH /api/agendamentos/:id/status */
  alterarStatus: asyncHandler(async (req, res) => {
    validate(req.body, {
      status: [
        rules.required('Status'),
        rules.oneOf('Status', ['confirmado', 'em_andamento', 'concluido', 'cancelado']),
      ],
      motivo: [rules.string('Motivo', { min: 3, max: 240 })],
    });

    res.json(
      agendamentoService.alterarStatus(req.usuario, req.params.id, req.body.status, req.body.motivo),
    );
  }),

  /** POST /api/agendamentos/:id/avaliacao */
  avaliar: asyncHandler(async (req, res) => {
    res.status(201).json(agendamentoService.avaliar(req.usuario, req.params.id, req.body));
  }),

  /** GET /api/prestador/agenda — painel do prestador */
  agendaDoPrestador: asyncHandler(async (req, res) => {
    res.json(agendamentoService.agendaDoPrestador(req.usuario));
  }),
};

export default agendamentoController;
