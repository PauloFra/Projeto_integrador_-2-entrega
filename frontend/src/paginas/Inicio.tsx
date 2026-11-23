import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  Heart,
  List,
  Map,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { api } from '../servicos/api';
import { useRecurso } from '../hooks/useRecurso';
import { useSessao } from '../contexto/SessaoContexto';
import { useNotificacao } from '../contexto/NotificacaoContexto';
import { Aviso, Botao, Carregando, EstadoVazio, Selo } from '../componentes/Basicos';
import { CartaoProfissional } from '../componentes/CartaoProfissional';
import { FiltrosBusca, FILTROS_INICIAIS, type Filtros } from '../componentes/FiltrosBusca';
import { MapaProfissionais } from '../componentes/MapaProfissionais';
import { ModalAgendamento } from '../componentes/ModalAgendamento';
import { formatarDiaMes, formatarQuando, PORTES } from '../utils/formato';
import type { Prestador } from '../tipos';

export const Inicio = () => {
  const { usuario } = useSessao();
  const { avisar } = useNotificacao();

  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS);
  const [visao, setVisao] = useState<'lista' | 'mapa'>('lista');
  const [escolhido, setEscolhido] = useState<Prestador | null>(null);
  const [agendarAgora, setAgendarAgora] = useState(false);

  const servicos = useRecurso(() => api.servicos(), []);
  const pets = useRecurso(() => api.pets(), []);
  const busca = useRecurso(
    () =>
      api.buscarPrestadores({
        servico: filtros.servico,
        raioKm: filtros.raioKm,
        notaMinima: filtros.notaMinima,
        precoMaximo: filtros.precoMaximo,
        disponivelAgora: filtros.disponivelAgora,
        ordenar: filtros.ordenar,
      }),
    [filtros],
  );

  const petPrincipal = pets.dados?.[0] ?? null;
  const detalhePet = useRecurso(
    () => api.pet(petPrincipal!.id),
    [petPrincipal?.id],
    Boolean(petPrincipal),
  );

  const primeiroNome = usuario?.nome.split(' ')[0] ?? '';
  const encontrados = busca.dados?.prestadores ?? [];

  const disponivelMaisProximo = useMemo(
    () => encontrados.find((p) => p.disponivelAgora && p.verificacao.status === 'verificado') ?? null,
    [encontrados],
  );

  const abrirAgendamento = (prestador: Prestador, imediato = false) => {
    setAgendarAgora(imediato);
    setEscolhido(prestador);
  };

  // O cartão "Na agenda" mostra o próximo compromisso, seja um cuidado
  // solicitado na plataforma ou uma consulta marcada pela clínica.
  const proximoCuidado = detalhePet.dados?.proximoCuidado ?? null;
  const proximaConsulta = detalhePet.dados?.proximaConsulta ?? null;
  const destaqueAgenda = proximoCuidado
    ? {
        titulo: proximoCuidado.titulo,
        inicioEm: proximoCuidado.inicioEm,
        detalhe: proximoCuidado.prestador.nome,
        selo: 'Cuidado agendado',
      }
    : proximaConsulta
      ? {
          titulo: proximaConsulta.titulo,
          inicioEm: proximaConsulta.inicioEm,
          detalhe: proximaConsulta.clinicaNome ?? proximaConsulta.veterinarioNome ?? '',
          selo: 'Consulta confirmada',
        }
      : null;

  return (
    <div className="pilha-grande">
      {/* ------------------------------------------------------- saudação */}
      <header className="linha-espalhada">
        <div className="saudacao">
          <span className="linha rotulo">
            <Sun size={14} aria-hidden /> Olá, {primeiroNome}
          </span>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3.4vw, 2rem)' }}>
            Um dia mais leve para você.
            {petPrincipal && ` Um dia mais feliz para a ${petPrincipal.nome}.`}
          </h1>
        </div>
        {detalhePet.dados?.saude.emDia && <Selo variante="principal">Tudo pronto para cuidar</Selo>}
      </header>

      {/* ------------------------------------------------------------ hero */}
      <section className="hero">
        <img className="hero__imagem" src="/imagens/luna-park.png" alt="" aria-hidden />
        <span className="hero__veu" aria-hidden />
        <div className="hero__conteudo">
          <span className="rotulo">Carinho que está por perto</span>
          <h1>
            O próximo {filtros.servico === 'passeio' ? 'passeio' : 'cuidado'}
            {petPrincipal ? ` da ${petPrincipal.nome}` : ''} começa aqui.
          </h1>
          <p>
            Encontre alguém de confiança para cuidar de quem faz o seu mundo mais feliz, com
            documentação verificada e avaliações reais.
          </p>
          <div className="hero__acoes">
            <Botao
              desabilitado={!disponivelMaisProximo || !petPrincipal}
              onClick={() => disponivelMaisProximo && abrirAgendamento(disponivelMaisProximo, true)}
            >
              Passeio agora
              <ArrowRight size={16} aria-hidden />
            </Botao>
            <a className="botao botao--contorno" href="#busca">
              Agendar para depois
            </a>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- busca */}
      <section className="pilha" id="busca">
        <div className="linha-espalhada">
          <div>
            <h2>Um bom passeio começa com confiança.</h2>
            <p className="texto-pequeno">
              {busca.carregando
                ? 'Procurando profissionais…'
                : `${busca.dados?.total ?? 0} profissional(is) perto de você`}
            </p>
          </div>

          <div className="abas" role="group" aria-label="Forma de visualizar os resultados">
            <button
              type="button"
              className="abas__item"
              aria-pressed={visao === 'lista'}
              onClick={() => setVisao('lista')}
            >
              <List size={14} aria-hidden /> Lista
            </button>
            <button
              type="button"
              className="abas__item"
              aria-pressed={visao === 'mapa'}
              onClick={() => setVisao('mapa')}
            >
              <Map size={14} aria-hidden /> Mapa
            </button>
          </div>
        </div>

        {servicos.dados && (
          <FiltrosBusca servicos={servicos.dados} filtros={filtros} onAlterar={setFiltros} />
        )}

        {busca.erro && <Aviso>{busca.erro}</Aviso>}
        {busca.carregando && <Carregando texto="Buscando quem cuida bem…" />}

        {!busca.carregando && encontrados.length === 0 && (
          <EstadoVazio
            icone={<Heart size={26} />}
            titulo="Nenhum profissional com esses filtros"
            descricao="Tente aumentar a distância ou liberar o filtro de preço."
            acao={
              <Botao variante="contorno" onClick={() => setFiltros(FILTROS_INICIAIS)}>
                Limpar filtros
              </Botao>
            }
          />
        )}

        {!busca.carregando && encontrados.length > 0 && visao === 'lista' && (
          <div className="grade grade--tres">
            {encontrados.map((prestador) => (
              <CartaoProfissional
                key={prestador.id}
                prestador={prestador}
                onEscolher={(selecionado) => abrirAgendamento(selecionado)}
              />
            ))}
          </div>
        )}

        {!busca.carregando && encontrados.length > 0 && visao === 'mapa' && (
          <MapaProfissionais
            origem={busca.dados?.origem ?? null}
            prestadores={encontrados}
            onEscolher={(selecionado) => abrirAgendamento(selecionado)}
          />
        )}

        <p className="linha texto-pequeno">
          <ShieldCheck size={16} aria-hidden style={{ color: 'var(--principal)' }} />
          Profissionais verificados. Cuidado de verdade.
        </p>
      </section>

      {/* -------------------------------------------- pet e próxima agenda */}
      <section className="grade grade--dois">
        {petPrincipal && (
          <article className="cartao cartao--generoso cartao--destaque pilha">
            <span className="rotulo">Sua melhor companhia</span>
            <div className="linha">
              {petPrincipal.fotoUrl && (
                <img
                  src={petPrincipal.fotoUrl}
                  alt={petPrincipal.nome}
                  width={72}
                  height={72}
                  style={{ borderRadius: 20, objectFit: 'cover' }}
                />
              )}
              <div>
                <h3>
                  {petPrincipal.nome} {petPrincipal.sexo === 'femea' ? '♀' : '♂'}
                </h3>
                <p className="texto-pequeno">
                  {[petPrincipal.raca, petPrincipal.idadeAnos && `${petPrincipal.idadeAnos} anos`,
                    petPrincipal.porte && PORTES[petPrincipal.porte]]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            </div>
            {detalhePet.dados?.saude.emDia && (
              <p className="texto-pequeno">Vacinas em dia, rabinho feliz!</p>
            )}
            <Link className="botao botao--suave" to={`/pets/${petPrincipal.id}`}>
              Ver perfil e saúde {petPrincipal.sexo === 'femea' ? 'da' : 'do'} {petPrincipal.nome}
              <ArrowRight size={16} aria-hidden />
            </Link>
          </article>
        )}

        <article className="cartao cartao--generoso pilha">
          <span className="rotulo">Na agenda</span>
          {destaqueAgenda ? (
            <>
              <div className="linha">
                <div className="agendamento__data" aria-hidden>
                  <strong>{formatarDiaMes(destaqueAgenda.inicioEm).dia}</strong>
                  <span>{formatarDiaMes(destaqueAgenda.inicioEm).mes}</span>
                </div>
                <div>
                  <h3>{destaqueAgenda.titulo}</h3>
                  <p className="texto-pequeno">
                    {formatarQuando(destaqueAgenda.inicioEm)}
                    {destaqueAgenda.detalhe ? ` · ${destaqueAgenda.detalhe}` : ''}
                  </p>
                </div>
              </div>
              <Selo variante="principal">
                <CalendarDays size={12} aria-hidden />
                {destaqueAgenda.selo}
              </Selo>
            </>
          ) : (
            <p className="texto-pequeno">Nenhum cuidado agendado por enquanto.</p>
          )}
          {petPrincipal && (
            <Link className="botao botao--texto" to="/passeios">
              Ver todos os cuidados <ArrowRight size={14} aria-hidden />
            </Link>
          )}
        </article>
      </section>

      {/* ---------------------------------------------------------- confiança */}
      <section className="cartao cartao--generoso grade grade--tres">
        <div>
          <h3>Seu pet em boas mãos</h3>
          <p className="texto-pequeno">
            Documentos verificados, avaliações reais e muito amor pelos animais.
          </p>
        </div>
        <div>
          <h3>Tudo registrado</h3>
          <p className="texto-pequeno">
            Carteira de vacinação, histórico de passeios e observações da clínica no mesmo lugar.
          </p>
        </div>
        <div>
          <h3>Uma comunidade feita de cuidado</h3>
          <p className="texto-pequeno">
            Profissionais do bairro, acompanhados por clínicas parceiras da região.
          </p>
        </div>
      </section>

      <ModalAgendamento
        prestador={escolhido}
        pets={pets.dados ?? []}
        imediato={agendarAgora}
        onFechar={() => setEscolhido(null)}
        onAgendado={(agendamento) => {
          setEscolhido(null);
          avisar(`Pedido enviado para ${agendamento.prestador.nome}. Conversa aberta!`);
          void detalhePet.recarregar();
          void busca.recarregar();
        }}
      />
    </div>
  );
};

export default Inicio;
