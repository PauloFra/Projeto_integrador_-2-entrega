import asyncHandler from '../utils/asyncHandler.js';
import conversaService from '../services/conversaService.js';

export const conversaController = {
  /** GET /api/conversas */
  listar: asyncHandler(async (req, res) => {
    const conversas = conversaService.listar(req.usuario);
    res.json({
      conversas,
      naoLidas: conversas.reduce((total, conversa) => total + conversa.naoLidas, 0),
    });
  }),

  /** GET /api/conversas/:id — conversa + mensagens (marca como lidas) */
  detalhar: asyncHandler(async (req, res) => {
    res.json(conversaService.detalhar(req.usuario, req.params.id));
  }),

  /** POST /api/conversas/:id/mensagens */
  enviarMensagem: asyncHandler(async (req, res) => {
    res.status(201).json(conversaService.enviarMensagem(req.usuario, req.params.id, req.body));
  }),
};

export default conversaController;
