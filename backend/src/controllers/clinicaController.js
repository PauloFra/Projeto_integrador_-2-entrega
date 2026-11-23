import asyncHandler from '../utils/asyncHandler.js';
import clinicaService from '../services/clinicaService.js';

export const clinicaController = {
  /** GET /api/clinica/visao-geral */
  visaoGeral: asyncHandler(async (req, res) => {
    res.json(clinicaService.visaoGeral(req.usuario));
  }),

  /** PATCH /api/clinica/profissionais/:id/verificacao  body: { acao: "verificar" | "revogar" } */
  alterarVerificacao: asyncHandler(async (req, res) => {
    res.json(clinicaService.alterarVerificacao(req.usuario, req.params.id, req.body));
  }),
};

export default clinicaController;
