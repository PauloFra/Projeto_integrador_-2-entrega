/**
 * Cliente HTTP da API Patas Conectadas.
 *
 * - a base vem de VITE_API_URL (padrão "/api", servido pelo proxy do Vite);
 * - o token de sessão é guardado em localStorage e enviado em Authorization;
 * - erros da API viram ErroApi, com mensagem pronta para a interface.
 */
import type {
  AgendaPrestador,
  Agendamento,
  ConversaDetalhe,
  Conversa,
  Mensagem,
  NovoAgendamento,
  Pet,
  PetDetalhe,
  PrestadorDetalhe,
  RegistroSaude,
  RespostaBusca,
  Servico,
  StatusAgendamento,
  Usuario,
  VisaoClinica,
} from '../tipos';

const BASE = import.meta.env.VITE_API_URL ?? '/api';
const CHAVE_TOKEN = 'patas:token';

export class ErroApi extends Error {
  status: number;
  detalhes?: Record<string, string>;

  constructor(mensagem: string, status: number, detalhes?: Record<string, string>) {
    super(mensagem);
    this.name = 'ErroApi';
    this.status = status;
    this.detalhes = detalhes;
  }
}

export const sessaoLocal = {
  ler(): string | null {
    try {
      return localStorage.getItem(CHAVE_TOKEN);
    } catch {
      return null;
    }
  },
  gravar(token: string) {
    try {
      localStorage.setItem(CHAVE_TOKEN, token);
    } catch {
      /* navegação privada: a sessão vale apenas para esta aba */
    }
  },
  limpar() {
    try {
      localStorage.removeItem(CHAVE_TOKEN);
    } catch {
      /* nada a fazer */
    }
  },
};

type Opcoes = {
  metodo?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  corpo?: unknown;
};

const pedir = async <T>(caminho: string, { metodo = 'GET', corpo }: Opcoes = {}): Promise<T> => {
  const token = sessaoLocal.ler();

  const resposta = await fetch(`${BASE}${caminho}`, {
    method: metodo,
    headers: {
      ...(corpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
  });

  if (resposta.status === 204) return undefined as T;

  const texto = await resposta.text();
  const dados = texto ? JSON.parse(texto) : null;

  if (!resposta.ok) {
    throw new ErroApi(
      dados?.erro ?? `Falha na requisição (${resposta.status}).`,
      resposta.status,
      dados?.detalhes,
    );
  }

  return dados as T;
};

const comFiltros = (caminho: string, filtros: Record<string, unknown>) => {
  const parametros = new URLSearchParams();
  for (const [chave, valor] of Object.entries(filtros)) {
    if (valor === undefined || valor === null || valor === '' || valor === false) continue;
    parametros.set(chave, String(valor));
  }
  const consulta = parametros.toString();
  return consulta ? `${caminho}?${consulta}` : caminho;
};

export const api = {
  // -------------------------------------------------------------- sessão
  async entrar(email: string, senha: string) {
    const dados = await pedir<{ token: string; usuario: Usuario }>('/auth/login', {
      metodo: 'POST',
      corpo: { email, senha },
    });
    sessaoLocal.gravar(dados.token);
    return dados.usuario;
  },

  sair() {
    sessaoLocal.limpar();
  },

  async eu() {
    const dados = await pedir<{ usuario: Usuario }>('/auth/eu');
    return dados.usuario;
  },

  // ------------------------------------------------------------ catálogo
  async servicos() {
    const dados = await pedir<{ servicos: Servico[] }>('/servicos');
    return dados.servicos;
  },

  // ---------------------------------------------------- profissionais
  buscarPrestadores(filtros: {
    servico?: string;
    raioKm?: number | '';
    notaMinima?: number | '';
    precoMaximo?: number | '';
    disponivelAgora?: boolean;
    termo?: string;
    ordenar?: 'distancia' | 'avaliacao' | 'preco';
  }) {
    return pedir<RespostaBusca>(comFiltros('/prestadores', filtros));
  },

  prestador(id: number) {
    return pedir<PrestadorDetalhe>(`/prestadores/${id}`);
  },

  alterarDisponibilidade(disponivelAgora: boolean) {
    return pedir<PrestadorDetalhe>('/prestadores/disponibilidade', {
      metodo: 'PATCH',
      corpo: { disponivelAgora },
    });
  },

  // ------------------------------------------------------------ pets
  async pets() {
    const dados = await pedir<{ pets: Pet[] }>('/pets');
    return dados.pets;
  },

  pet(id: number) {
    return pedir<PetDetalhe>(`/pets/${id}`);
  },

  adicionarRegistroSaude(
    petId: number,
    registro: { tipo: string; nome: string; aplicadoEm: string; proximaDose?: string; observacao?: string },
  ) {
    return pedir<RegistroSaude>(`/pets/${petId}/saude`, { metodo: 'POST', corpo: registro });
  },

  // ---------------------------------------------------- agendamentos
  async agendamentos(filtros: { status?: string; petId?: number } = {}) {
    const dados = await pedir<{ agendamentos: Agendamento[] }>(
      comFiltros('/agendamentos', filtros),
    );
    return dados.agendamentos;
  },

  criarAgendamento(dados: NovoAgendamento) {
    return pedir<Agendamento>('/agendamentos', { metodo: 'POST', corpo: dados });
  },

  alterarStatus(id: number, status: StatusAgendamento, motivo?: string) {
    return pedir<Agendamento>(`/agendamentos/${id}/status`, {
      metodo: 'PATCH',
      corpo: { status, motivo },
    });
  },

  avaliar(id: number, nota: number, comentario?: string) {
    return pedir<{ avaliacao: { nota: number }; prestador: PrestadorDetalhe }>(
      `/agendamentos/${id}/avaliacao`,
      { metodo: 'POST', corpo: { nota, comentario } },
    );
  },

  // -------------------------------------------------- área do prestador
  agendaDoPrestador() {
    return pedir<AgendaPrestador>('/prestador/agenda');
  },

  // ------------------------------------------------------------ mensagens
  conversas() {
    return pedir<{ conversas: Conversa[]; naoLidas: number }>('/conversas');
  },

  conversa(id: number) {
    return pedir<ConversaDetalhe>(`/conversas/${id}`);
  },

  enviarMensagem(conversaId: number, conteudo: string) {
    return pedir<Mensagem>(`/conversas/${conversaId}/mensagens`, {
      metodo: 'POST',
      corpo: { conteudo },
    });
  },

  // -------------------------------------------------------------- clínica
  visaoClinica() {
    return pedir<VisaoClinica>('/clinica/visao-geral');
  },

  alterarVerificacao(prestadorId: number, acao: 'verificar' | 'revogar') {
    return pedir<PrestadorDetalhe>(`/clinica/profissionais/${prestadorId}/verificacao`, {
      metodo: 'PATCH',
      corpo: { acao },
    });
  },
};

export default api;
