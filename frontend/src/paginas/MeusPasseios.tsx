import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Footprints, Plus } from 'lucide-react';
import { api, ErroApi } from '../servicos/api';
import { useRecurso } from '../hooks/useRecurso';
import { useNotificacao } from '../contexto/NotificacaoContexto';
import { Aviso, Carregando, EstadoVazio } from '../componentes/Basicos';
import { CartaoAgendamento } from '../componentes/CartaoAgendamento';
import { ModalAvaliacao } from '../componentes/ModalAvaliacao';
import type { Agendamento, StatusAgendamento } from '../tipos';

const ABAS = [
  { chave: 'todos', rotulo: 'Todos' },
  { chave: 'ativos', rotulo: 'Em andamento' },
  { chave: 'concluido', rotulo: 'Concluídos' },
] as const;

type Aba = (typeof ABAS)[number]['chave'];

const ATIVOS: StatusAgendamento[] = ['solicitado', 'confirmado', 'em_andamento'];

export const MeusPasseios = () => {
  const { avisar } = useNotificacao();
  const [aba, setAba] = useState<Aba>('todos');
  const [avaliando, setAvaliando] = useState<Agendamento | null>(null);

  const agendamentos = useRecurso(() => api.agendamentos(), []);

  const lista = useMemo(() => {
    const todos = agendamentos.dados ?? [];
    if (aba === 'ativos') return todos.filter((item) => ATIVOS.includes(item.status));
    if (aba === 'concluido') return todos.filter((item) => item.status === 'concluido');
    return todos;
  }, [agendamentos.dados, aba]);

  const ativos = (agendamentos.dados ?? []).filter((item) => ATIVOS.includes(item.status));

  const cancelar = async (agendamento: Agendamento) => {
    try {
      await api.alterarStatus(agendamento.id, 'cancelado', 'Cancelado pela tutora no aplicativo.');
      avisar('Cuidado cancelado. O profissional foi avisado.', 'informacao');
      void agendamentos.recarregar();
    } catch (falha) {
      avisar(falha instanceof ErroApi ? falha.message : 'Não foi possível cancelar.', 'erro');
    }
  };

  return (
    <div className="pilha-grande">
      <header className="linha-espalhada">
        <div>
          <h1>Meus passeios</h1>
          <p>Pequenas aventuras, grandes momentos para quem você ama.</p>
        </div>
        <Link className="botao botao--principal" to="/">
          <Plus size={16} aria-hidden /> Novo cuidado
        </Link>
      </header>

      <div className="abas" role="tablist" aria-label="Filtrar cuidados">
        {ABAS.map((item) => (
          <button
            key={item.chave}
            type="button"
            role="tab"
            aria-selected={aba === item.chave}
            className="abas__item"
            onClick={() => setAba(item.chave)}
          >
            {item.rotulo}
          </button>
        ))}
      </div>

      {agendamentos.carregando && <Carregando />}
      {agendamentos.erro && <Aviso>{agendamentos.erro}</Aviso>}

      {!agendamentos.carregando && aba !== 'concluido' && ativos.length === 0 && (
        <EstadoVazio
          icone={<Footprints size={26} />}
          titulo="Vamos fazer o primeiro passeio?"
          descricao="A próxima aventura começa escolhendo um bom cuidador por perto."
          acao={
            <Link className="botao botao--principal" to="/">
              Encontrar um profissional
            </Link>
          }
        />
      )}

      {!agendamentos.carregando && lista.length > 0 && (
        <section className="pilha">
          <h2 style={{ fontSize: '1.2rem' }}>
            {aba === 'concluido' ? 'Outras boas lembranças' : 'Cuidados registrados'}
          </h2>
          {lista.map((agendamento) => (
            <CartaoAgendamento
              key={agendamento.id}
              agendamento={agendamento}
              papel="tutor"
              onAlterarStatus={(alvo, status) => {
                if (status === 'cancelado') void cancelar(alvo);
              }}
              onAvaliar={setAvaliando}
            />
          ))}
        </section>
      )}

      <ModalAvaliacao
        agendamento={avaliando}
        onFechar={() => setAvaliando(null)}
        onAvaliado={(media) => {
          setAvaliando(null);
          avisar(`Obrigada pela avaliação! Nova média do profissional: ${media.toFixed(2)}.`);
          void agendamentos.recarregar();
        }}
      />
    </div>
  );
};

export default MeusPasseios;
