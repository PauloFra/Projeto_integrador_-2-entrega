import { CalendarDays, Footprints, Star, Wallet } from 'lucide-react';
import { api, ErroApi } from '../servicos/api';
import { useRecurso } from '../hooks/useRecurso';
import { useNotificacao } from '../contexto/NotificacaoContexto';
import { Aviso, Carregando, EstadoVazio, Indicador, Selo } from '../componentes/Basicos';
import { CartaoAgendamento } from '../componentes/CartaoAgendamento';
import { formatarNota, formatarReais } from '../utils/formato';
import type { Agendamento, StatusAgendamento } from '../tipos';

export const AgendaPrestador = () => {
  const { avisar } = useNotificacao();
  const agenda = useRecurso(() => api.agendaDoPrestador(), []);

  const alterar = async (agendamento: Agendamento, status: StatusAgendamento) => {
    try {
      await api.alterarStatus(agendamento.id, status);
      const rotulos: Record<string, string> = {
        confirmado: 'Atendimento confirmado.',
        em_andamento: 'Passeio iniciado. Bom passeio!',
        concluido: 'Atendimento concluído. O tutor pode avaliar agora.',
        cancelado: 'Atendimento cancelado.',
      };
      avisar(rotulos[status] ?? 'Status atualizado.');
      void agenda.recarregar();
    } catch (falha) {
      avisar(
        falha instanceof ErroApi ? falha.message : 'Não foi possível atualizar o atendimento.',
        'erro',
      );
    }
  };

  const alternarDisponibilidade = async () => {
    if (!agenda.dados) return;
    try {
      await api.alterarDisponibilidade(!agenda.dados.prestador.disponivelAgora);
      void agenda.recarregar();
    } catch (falha) {
      avisar(falha instanceof ErroApi ? falha.message : 'Não foi possível alterar.', 'erro');
    }
  };

  if (agenda.carregando) return <Carregando texto="Organizando sua agenda…" />;
  if (agenda.erro) return <Aviso>{agenda.erro}</Aviso>;
  if (!agenda.dados) return null;

  const { prestador, indicadores, proximos, historico } = agenda.dados;

  return (
    <div className="pilha-grande">
      <header className="linha-espalhada">
        <div>
          <span className="rotulo">Área do prestador</span>
          <h1>Olá, {prestador.nome.split(' ')[0]} 👋</h1>
          <p>Sua agenda organizada. Mais tempo para cuidar.</p>
        </div>

        <button
          type="button"
          className="interruptor"
          aria-pressed={prestador.disponivelAgora}
          onClick={alternarDisponibilidade}
        >
          {prestador.disponivelAgora ? 'Disponível para passear' : 'Indisponível agora'}
        </button>
      </header>

      <section className="grade grade--quatro">
        <Indicador
          valor={indicadores.naAgenda}
          rotulo="Atendimentos na agenda"
          icone={<CalendarDays size={16} aria-hidden />}
        />
        <Indicador
          valor={indicadores.atendimentosNoMes}
          rotulo="Atendimentos concluídos no mês"
          icone={<Footprints size={16} aria-hidden />}
        />
        <Indicador
          valor={formatarReais(indicadores.recebidoNoMesCentavos)}
          rotulo="Recebido no mês"
          icone={<Wallet size={16} aria-hidden />}
        />
        <Indicador
          valor={formatarNota(indicadores.avaliacaoMedia)}
          rotulo="Avaliação dos tutores"
          icone={<Star size={16} aria-hidden />}
        />
      </section>

      <section className="pilha">
        <div className="linha-espalhada">
          <h2 style={{ fontSize: '1.2rem' }}>Próximos atendimentos</h2>
          <Selo variante={prestador.verificacao.status === 'verificado' ? 'principal' : 'alerta'}>
            Verificação {prestador.verificacao.status}
          </Selo>
        </div>

        {proximos.length === 0 ? (
          <EstadoVazio
            icone={<CalendarDays size={26} />}
            titulo="Nenhum atendimento à frente"
            descricao="Novos pedidos dos tutores aparecem aqui automaticamente."
          />
        ) : (
          proximos.map((agendamento) => (
            <CartaoAgendamento
              key={agendamento.id}
              agendamento={agendamento}
              papel="prestador"
              mostrarTutor
              onAlterarStatus={(alvo, status) => void alterar(alvo, status)}
            />
          ))
        )}
      </section>

      {historico.length > 0 && (
        <section className="pilha">
          <h2 style={{ fontSize: '1.2rem' }}>Últimos atendimentos concluídos</h2>
          {historico.slice(0, 5).map((agendamento) => (
            <CartaoAgendamento
              key={agendamento.id}
              agendamento={agendamento}
              papel="prestador"
              mostrarTutor
            />
          ))}
        </section>
      )}

      <p className="texto-pequeno">
        Os valores exibidos são da PoC e não representam repasse financeiro real.
      </p>
    </div>
  );
};

export default AgendaPrestador;
