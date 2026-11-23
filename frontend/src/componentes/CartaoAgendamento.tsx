import { Clock, MapPin, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Botao, Estrelas, Selo } from './Basicos';
import {
  STATUS_AGENDAMENTO,
  formatarDiaMes,
  formatarDuracao,
  formatarQuando,
  formatarReais,
} from '../utils/formato';
import type { Agendamento, Papel, StatusAgendamento } from '../tipos';

interface Props {
  agendamento: Agendamento;
  papel: Papel;
  onAlterarStatus?: (agendamento: Agendamento, status: StatusAgendamento) => void;
  onAvaliar?: (agendamento: Agendamento) => void;
  mostrarTutor?: boolean;
}

/** Próximas ações possíveis, de acordo com o papel e o status atual. */
const acoesPorStatus = (status: StatusAgendamento, papel: Papel) => {
  if (papel === 'prestador') {
    if (status === 'solicitado') return [{ status: 'confirmado' as const, rotulo: 'Confirmar' }];
    if (status === 'confirmado') return [{ status: 'em_andamento' as const, rotulo: 'Iniciar' }];
    if (status === 'em_andamento') return [{ status: 'concluido' as const, rotulo: 'Concluir' }];
    return [];
  }
  if (status === 'solicitado' || status === 'confirmado') {
    return [{ status: 'cancelado' as const, rotulo: 'Cancelar' }];
  }
  return [];
};

export const CartaoAgendamento = ({
  agendamento,
  papel,
  onAlterarStatus,
  onAvaliar,
  mostrarTutor = false,
}: Props) => {
  const { dia, mes } = formatarDiaMes(agendamento.inicioEm);
  const info = STATUS_AGENDAMENTO[agendamento.status];
  const acoes = acoesPorStatus(agendamento.status, papel);

  return (
    <article className="cartao agendamento">
      <div className="agendamento__data" aria-hidden>
        <strong>{dia}</strong>
        <span>{mes}</span>
      </div>

      <div className="agendamento__corpo">
        <div className="linha" style={{ flexWrap: 'wrap' }}>
          <h3>{agendamento.titulo}</h3>
          <Selo variante={info.selo}>{info.rotulo}</Selo>
          {agendamento.avaliacao && <Estrelas nota={agendamento.avaliacao.nota} />}
        </div>

        <p className="texto-pequeno">
          {formatarQuando(agendamento.inicioEm)} ·{' '}
          <Clock size={12} aria-hidden /> {formatarDuracao(agendamento.duracaoMinutos)} ·{' '}
          {formatarReais(agendamento.valorCentavos)}
        </p>

        <p className="texto-pequeno">
          {mostrarTutor
            ? `${agendamento.pet.nome} · ${agendamento.tutor.nome}`
            : `${agendamento.servico.nome} com ${agendamento.prestador.nome}`}
          {agendamento.localEncontro && (
            <>
              {' · '}
              <MapPin size={12} aria-hidden /> {agendamento.localEncontro}
            </>
          )}
        </p>

        {agendamento.canceladoMotivo && agendamento.status === 'cancelado' && (
          <p className="texto-pequeno">Motivo: {agendamento.canceladoMotivo}</p>
        )}
      </div>

      <div className="agendamento__acoes">
        {agendamento.conversaId && (
          <Link
            className="botao botao--contorno botao--pequeno"
            to={`/mensagens?conversa=${agendamento.conversaId}`}
          >
            <MessageCircle size={14} aria-hidden /> Conversar
          </Link>
        )}

        {acoes.map((acao) => (
          <Botao
            key={acao.status}
            pequeno
            variante={acao.status === 'cancelado' ? 'alerta' : 'principal'}
            onClick={() => onAlterarStatus?.(agendamento, acao.status)}
          >
            {acao.rotulo}
          </Botao>
        ))}

        {papel === 'tutor' && agendamento.status === 'concluido' && !agendamento.avaliacao && (
          <Botao pequeno variante="suave" onClick={() => onAvaliar?.(agendamento)}>
            Avaliar
          </Botao>
        )}
      </div>
    </article>
  );
};

export default CartaoAgendamento;
