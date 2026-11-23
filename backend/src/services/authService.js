import AppError from '../utils/AppError.js';
import { createToken, readToken, verifyPassword } from '../utils/crypto.js';
import usuarioRepository from '../repositories/usuarioRepository.js';
import prestadorRepository from '../repositories/prestadorRepository.js';
import clinicaRepository from '../repositories/clinicaRepository.js';

/**
 * Monta o "perfil de sessão": dados do usuário mais o contexto do papel
 * (perfil de prestador ou clínica vinculada), que o frontend usa para
 * decidir quais áreas exibir.
 */
const montarSessao = (usuario) => {
  const sessao = { ...usuario };

  if (usuario.papel === 'prestador') {
    const prestador = prestadorRepository.buscarPorUsuarioId(usuario.id);
    sessao.prestador = prestador
      ? {
          id: prestador.id,
          titulo: prestador.titulo,
          especialidade: prestador.especialidade,
          servico: prestador.servico,
          verificacao: prestador.verificacao,
          disponivelAgora: prestador.disponivelAgora,
          avaliacaoMedia: prestador.avaliacaoMedia,
        }
      : null;
  }

  if (usuario.papel === 'clinica') {
    sessao.clinica = clinicaRepository.buscarPorResponsavel(usuario.id);
  }

  return sessao;
};

export const authService = {
  login({ email, senha }) {
    const linha = usuarioRepository.buscarLinhaPorEmail(String(email).trim());
    if (!linha || !verifyPassword(senha, linha.senha_hash)) {
      throw AppError.unauthorized('E-mail ou senha incorretos.');
    }

    const usuario = usuarioRepository.mapear(linha);
    return {
      token: createToken({ sub: usuario.id, papel: usuario.papel }),
      usuario: montarSessao(usuario),
    };
  },

  /** Resolve o usuário a partir do token enviado no header Authorization. */
  usuarioDoToken(token) {
    const payload = readToken(token);
    if (!payload) return null;
    const usuario = usuarioRepository.buscarPorId(payload.sub);
    return usuario ? montarSessao(usuario) : null;
  },

  montarSessao,
};

export default authService;
