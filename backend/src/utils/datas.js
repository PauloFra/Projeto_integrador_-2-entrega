const pad = (valor) => String(valor).padStart(2, '0');

/**
 * Data/hora local em ISO sem fuso ("2026-11-23T14:05:00").
 * Todo o projeto usa esse formato para agendamentos, o que mantém
 * a comparação de horários simples (ordem lexicográfica = ordem cronológica).
 */
export const isoLocal = (data = new Date()) =>
  `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}T` +
  `${pad(data.getHours())}:${pad(data.getMinutes())}:${pad(data.getSeconds())}`;

export const agoraIso = () => isoLocal(new Date());

/** Competência do mês corrente ("2026-11"), usada nos indicadores. */
export const mesAtualIso = (data = new Date()) =>
  `${data.getFullYear()}-${pad(data.getMonth() + 1)}`;

export const somenteData = (iso) => (typeof iso === 'string' ? iso.slice(0, 10) : null);

/** Soma minutos a uma data ISO local e devolve ISO local. */
export const adicionarMinutos = (iso, minutos) => {
  const data = new Date(iso);
  data.setMinutes(data.getMinutes() + minutos);
  return isoLocal(data);
};

/** Diferença em dias inteiros entre uma data (YYYY-MM-DD) e hoje. */
export const diasAte = (dataIso) => {
  if (!dataIso) return null;
  const alvo = new Date(`${somenteData(dataIso)}T00:00:00`);
  const hoje = new Date();
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((alvo.getTime() - base.getTime()) / 86400000);
};

/** Verifica se dois intervalos [inicio, fim) se sobrepõem. */
export const intervalosSobrepostos = (inicioA, fimA, inicioB, fimB) =>
  inicioA < fimB && inicioB < fimA;
