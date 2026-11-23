/**
 * Contratos de dados compartilhados com a API.
 * Espelham as respostas documentadas em docs/api.md.
 */

export type Papel = 'tutor' | 'prestador' | 'clinica';

export type StatusAgendamento =
  | 'solicitado'
  | 'confirmado'
  | 'em_andamento'
  | 'concluido'
  | 'cancelado';

export type StatusVerificacao = 'pendente' | 'verificado' | 'revogado';

export interface Coordenada {
  lat: number;
  lng: number;
}

export interface Servico {
  id: number;
  slug: string;
  nome: string;
  descricao: string | null;
  icone: string | null;
  totalPrestadores?: number;
}

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  papel: Papel;
  telefone: string | null;
  bairro: string | null;
  cidade: string | null;
  coordenada: Coordenada | null;
  avatarUrl: string | null;
  prestador?: {
    id: number;
    titulo: string;
    especialidade: string | null;
    servico: Pick<Servico, 'slug' | 'nome' | 'icone'>;
    verificacao: { status: StatusVerificacao; verificadoEm: string | null };
    disponivelAgora: boolean;
    avaliacaoMedia: number;
  } | null;
  clinica?: {
    id: number;
    nome: string;
    bairro: string | null;
    cidade: string | null;
  } | null;
}

export interface Prestador {
  id: number;
  usuarioId: number;
  nome: string;
  nomeDocumento: string | null;
  email: string;
  telefone: string | null;
  avatarUrl: string | null;
  titulo: string;
  especialidade: string | null;
  bio: string | null;
  precoCentavos: number;
  duracaoMinutos: number;
  avaliacaoMedia: number;
  avaliacoesTotal: number;
  disponivelAgora: boolean;
  verificacao: {
    status: StatusVerificacao;
    verificadoEm: string | null;
    documento: string | null;
  };
  clinicaId: number | null;
  bairro: string | null;
  cidade: string | null;
  coordenada: Coordenada | null;
  servico: Pick<Servico, 'slug' | 'nome' | 'icone'>;
  distanciaKm: number | null;
}

export interface Avaliacao {
  id: number;
  nota: number;
  comentario: string | null;
  autorNome: string;
  criadoEm: string;
}

export interface PrestadorDetalhe extends Prestador {
  avaliacoesRecentes: Avaliacao[];
}

export interface RespostaBusca {
  total: number;
  filtrosAplicados: {
    servico: string | null;
    raioKm: number | null;
    notaMinima: number | null;
    precoMaximo: number | null;
    disponivelAgora: boolean | null;
    ordenar: string;
  };
  origem: Coordenada | null;
  prestadores: Prestador[];
}

export interface Pet {
  id: number;
  tutorId: number;
  nome: string;
  especie: string;
  raca: string | null;
  sexo: 'femea' | 'macho' | null;
  idadeAnos: number | null;
  pesoKg: number | null;
  porte: 'pequeno' | 'medio' | 'grande' | null;
  castrado: boolean;
  microchipado: boolean;
  sociavel: boolean;
  sobre: string | null;
  fotoUrl: string | null;
}

export interface RegistroSaude {
  id: number;
  tipo: 'vacina' | 'vermifugo' | 'antipulgas' | 'exame' | 'consulta';
  nome: string;
  aplicadoEm: string;
  proximaDose: string | null;
  status: 'em_dia' | 'protegida' | 'atrasado';
  observacao: string | null;
  diasParaProximaDose: number | null;
}

export interface NotaVeterinaria {
  id: number;
  clinicaNome: string | null;
  veterinarioNome: string;
  crmv: string | null;
  conteudo: string;
  registradoEm: string;
}

export interface Consulta {
  id: number;
  titulo: string;
  inicioEm: string;
  veterinarioNome: string | null;
  status: 'confirmada' | 'realizada' | 'cancelada';
  observacao: string | null;
  clinicaNome: string | null;
}

export interface ItemHistorico {
  tipo: 'cuidado' | 'consulta';
  titulo: string;
  quando: string;
  detalhe: string | null;
  nota: number | null;
  status: string;
}

export interface Agendamento {
  id: number;
  codigo: string;
  titulo: string;
  inicioEm: string;
  duracaoMinutos: number;
  valorCentavos: number;
  status: StatusAgendamento;
  localEncontro: string | null;
  observacoes: string | null;
  concluidoEm: string | null;
  canceladoMotivo: string | null;
  pet: { id: number; nome: string; raca: string | null; porte: string | null; fotoUrl: string | null };
  tutor: { id: number; nome: string; telefone: string | null };
  prestador: {
    id: number;
    usuarioId: number;
    nome: string;
    titulo: string;
    especialidade: string | null;
    avatarUrl: string | null;
    telefone: string | null;
    avaliacaoMedia: number;
  };
  servico: { slug: string; nome: string };
  avaliacao: { nota: number; comentario: string | null } | null;
  conversaId: number | null;
}

export interface PetDetalhe extends Pet {
  saude: {
    registros: RegistroSaude[];
    emDia: boolean;
    notas: NotaVeterinaria[];
  };
  historico: ItemHistorico[];
  proximaConsulta: Consulta | null;
  proximoCuidado: Agendamento | null;
}

export interface Conversa {
  id: number;
  agendamento: { id: number; codigo: string; titulo: string; inicioEm: string; status: StatusAgendamento };
  pet: { nome: string; fotoUrl: string | null };
  tutor: { id: number; nome: string };
  prestador: { id: number; usuarioId: number; nome: string; titulo: string; avatarUrl: string | null };
  contraparte: { nome: string; papel: Papel; avatarUrl: string | null };
  ultimaMensagem: string | null;
  ultimaMensagemEm: string | null;
  naoLidas: number;
}

export interface Mensagem {
  id: number;
  conversaId: number;
  autorId: number;
  autorNome: string;
  conteudo: string;
  lida: boolean;
  enviadoEm: string;
}

export interface ConversaDetalhe extends Conversa {
  mensagens: Mensagem[];
}

export interface AgendaPrestador {
  prestador: Prestador;
  indicadores: {
    naAgenda: number;
    atendimentosNoMes: number;
    recebidoNoMesCentavos: number;
    avaliacaoMedia: number;
  };
  proximos: Agendamento[];
  historico: Agendamento[];
}

export interface EventoVerificacao {
  id: number;
  prestadorNome: string;
  atorNome: string;
  acao: 'verificar' | 'revogar';
  statusAnterior: StatusVerificacao;
  statusNovo: StatusVerificacao;
  criadoEm: string;
}

export interface VisaoClinica {
  clinica: { id: number; nome: string; cnpj: string | null; bairro: string | null; cidade: string | null };
  indicadores: {
    profissionaisParceiros: number;
    profissionaisVerificados: number;
    servicosNoMes: number;
    petsAcompanhados: number;
  };
  profissionais: Prestador[];
  eventosRecentes: EventoVerificacao[];
}

export interface NovoAgendamento {
  petId: number;
  prestadorId: number;
  inicioEm: string;
  duracaoMinutos?: number;
  titulo?: string;
  observacoes?: string;
  localEncontro?: string;
}
