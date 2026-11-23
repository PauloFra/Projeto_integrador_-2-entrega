/** Formatações de moeda, data e texto usadas em toda a interface. */

const moeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export const formatarReais = (centavos: number) => moeda.format(centavos / 100);

export const formatarNota = (nota: number) =>
  nota.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const formatarDistancia = (km: number | null) =>
  km === null ? 'distância indisponível' : `${km.toLocaleString('pt-BR')} km de você`;

export const formatarDuracao = (minutos: number) => {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas}h` : `${horas}h${String(resto).padStart(2, '0')}`;
};

const comoData = (iso: string) => new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);

export const formatarData = (iso: string) =>
  comoData(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export const formatarHora = (iso: string) =>
  comoData(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export const formatarDiaMes = (iso: string) => {
  const data = comoData(iso);
  return {
    dia: String(data.getDate()).padStart(2, '0'),
    mes: data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase(),
  };
};

/** "Hoje, 17h" · "Amanhã, 9h" · "Quarta, 10h" · "25/11, 10h" */
export const formatarQuando = (iso: string) => {
  const data = comoData(iso);
  const hoje = new Date();
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const alvo = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  const dias = Math.round((alvo.getTime() - base.getTime()) / 86400000);

  const hora = data.getMinutes() === 0 ? `${data.getHours()}h` : formatarHora(iso);

  if (dias === 0) return `Hoje, ${hora}`;
  if (dias === 1) return `Amanhã, ${hora}`;
  if (dias === -1) return `Ontem, ${hora}`;
  if (dias > 1 && dias < 7) {
    const semana = data.toLocaleDateString('pt-BR', { weekday: 'long' });
    return `${semana.charAt(0).toUpperCase()}${semana.slice(1)}, ${hora}`;
  }
  return `${formatarData(iso)}, ${hora}`;
};

/** Texto relativo curto para listas de mensagens. */
export const formatarRelativo = (iso: string | null) => {
  if (!iso) return '';
  const minutos = Math.round((Date.now() - comoData(iso).getTime()) / 60000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `${horas} h`;
  const dias = Math.round(horas / 24);
  if (dias < 7) return `${dias} d`;
  return formatarData(iso);
};

export const iniciais = (nome: string) =>
  nome
    .split(' ')
    .filter((parte) => parte.length > 2 || parte === parte.toUpperCase())
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join('');

export const PORTES: Record<string, string> = {
  pequeno: 'Porte pequeno',
  medio: 'Porte médio',
  grande: 'Porte grande',
};

export const STATUS_AGENDAMENTO: Record<string, { rotulo: string; selo: string }> = {
  solicitado: { rotulo: 'Aguardando confirmação', selo: 'selo--mel' },
  confirmado: { rotulo: 'Agendado', selo: 'selo--principal' },
  em_andamento: { rotulo: 'Em andamento', selo: 'selo--terracota' },
  concluido: { rotulo: 'Concluído', selo: 'selo--neutro' },
  cancelado: { rotulo: 'Cancelado', selo: 'selo--alerta' },
};

export const STATUS_SAUDE: Record<string, { rotulo: string; selo: string }> = {
  em_dia: { rotulo: 'Em dia', selo: 'selo--principal' },
  protegida: { rotulo: 'Protegida', selo: 'selo--mel' },
  atrasado: { rotulo: 'Atrasado', selo: 'selo--alerta' },
};

export const STATUS_VERIFICACAO: Record<string, { rotulo: string; selo: string }> = {
  verificado: { rotulo: 'Verificado', selo: 'selo--principal' },
  pendente: { rotulo: 'Pendente', selo: 'selo--mel' },
  revogado: { rotulo: 'Revogado', selo: 'selo--alerta' },
};

/** Entrada para <input type="datetime-local"> a partir de "agora + horas". */
export const sugestaoDataHora = (horasAfrente = 24) => {
  const data = new Date();
  data.setHours(data.getHours() + horasAfrente, 0, 0, 0);
  const pad = (valor: number) => String(valor).padStart(2, '0');
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}T${pad(
    data.getHours(),
  )}:${pad(data.getMinutes())}`;
};
