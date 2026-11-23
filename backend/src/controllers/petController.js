import asyncHandler from '../utils/asyncHandler.js';
import petService from '../services/petService.js';

export const petController = {
  /** GET /api/pets */
  listar: asyncHandler(async (req, res) => {
    res.json({ pets: petService.listarDoTutor(req.usuario) });
  }),

  /** GET /api/pets/:id — perfil completo com saúde e histórico */
  detalhar: asyncHandler(async (req, res) => {
    res.json(petService.detalhar(req.usuario, req.params.id));
  }),

  /** POST /api/pets */
  criar: asyncHandler(async (req, res) => {
    res.status(201).json(petService.criar(req.usuario, req.body));
  }),

  /** PATCH /api/pets/:id */
  atualizar: asyncHandler(async (req, res) => {
    res.json(petService.atualizar(req.usuario, req.params.id, req.body));
  }),

  /** POST /api/pets/:id/saude — novo item na carteira de vacinação */
  adicionarRegistroSaude: asyncHandler(async (req, res) => {
    res.status(201).json(petService.adicionarRegistroSaude(req.usuario, req.params.id, req.body));
  }),
};

export default petController;
