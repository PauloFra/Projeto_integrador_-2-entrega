import asyncHandler from '../utils/asyncHandler.js';
import { validate, rules } from '../utils/validate.js';
import authService from '../services/authService.js';

export const authController = {
  /** POST /api/auth/login */
  login: asyncHandler(async (req, res) => {
    validate(req.body, {
      email: [rules.required('E-mail'), rules.string('E-mail', { min: 5, max: 160 })],
      senha: [rules.required('Senha'), rules.string('Senha', { min: 4, max: 120 })],
    });

    const resultado = authService.login(req.body);
    res.json(resultado);
  }),

  /** GET /api/auth/eu — perfil da sessão atual */
  eu: asyncHandler(async (req, res) => {
    res.json({ usuario: req.usuario });
  }),
};

export default authController;
