import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MessageCircle, Send } from 'lucide-react';
import { api, ErroApi } from '../servicos/api';
import { useRecurso } from '../hooks/useRecurso';
import { useSessao } from '../contexto/SessaoContexto';
import { Avatar, Aviso, Botao, Carregando, EstadoVazio, Selo } from '../componentes/Basicos';
import { STATUS_AGENDAMENTO, formatarHora, formatarRelativo } from '../utils/formato';

export const Mensagens = () => {
  const { usuario } = useSessao();
  const [parametros, setParametros] = useSearchParams();
  const selecionada = parametros.get('conversa');

  const [texto, setTexto] = useState('');
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const fim = useRef<HTMLDivElement | null>(null);

  const conversas = useRecurso(() => api.conversas(), []);
  const conversa = useRecurso(
    () => api.conversa(Number(selecionada)),
    [selecionada],
    Boolean(selecionada),
  );

  // Seleciona a primeira conversa automaticamente em telas largas.
  useEffect(() => {
    const lista = conversas.dados?.conversas ?? [];
    if (!selecionada && lista.length > 0) {
      setParametros({ conversa: String(lista[0].id) }, { replace: true });
    }
  }, [conversas.dados, selecionada, setParametros]);

  useEffect(() => {
    fim.current?.scrollIntoView({ block: 'end' });
  }, [conversa.dados?.mensagens.length]);

  const enviar = async () => {
    if (!conversa.dados || texto.trim().length === 0) return;
    setErroEnvio(null);
    setEnviando(true);
    try {
      await api.enviarMensagem(conversa.dados.id, texto.trim());
      setTexto('');
      await conversa.recarregar();
      void conversas.recarregar();
    } catch (falha) {
      setErroEnvio(falha instanceof ErroApi ? falha.message : 'Não foi possível enviar.');
    } finally {
      setEnviando(false);
    }
  };

  const lista = conversas.dados?.conversas ?? [];

  return (
    <div className="pilha-grande">
      <header>
        <h1>Conversas que cuidam</h1>
        <p>Um contato próximo para deixar você mais tranquila.</p>
      </header>

      {conversas.carregando && <Carregando />}
      {conversas.erro && <Aviso>{conversas.erro}</Aviso>}

      {!conversas.carregando && lista.length === 0 && (
        <EstadoVazio
          icone={<MessageCircle size={26} />}
          titulo="Seu próximo cuidador está a uma conversa"
          descricao="As conversas ficam disponíveis depois de um agendamento."
          acao={
            <Link className="botao botao--principal" to="/">
              Encontrar um profissional
            </Link>
          }
        />
      )}

      {lista.length > 0 && (
        <div className="mensagens">
          <aside className="cartao" style={{ padding: 8 }}>
            {lista.map((item) => (
              <button
                key={item.id}
                type="button"
                className="conversa-resumo"
                aria-current={String(item.id) === selecionada}
                onClick={() => setParametros({ conversa: String(item.id) })}
              >
                <Avatar nome={item.contraparte.nome} foto={item.contraparte.avatarUrl} />
                <span className="conversa-resumo__corpo">
                  <strong>{item.contraparte.nome}</strong>
                  <p className="texto-suave">{item.ultimaMensagem ?? 'Conversa aberta'}</p>
                </span>
                <span className="pilha" style={{ gap: 4, alignItems: 'flex-end' }}>
                  <span className="texto-pequeno texto-suave">
                    {formatarRelativo(item.ultimaMensagemEm)}
                  </span>
                  {item.naoLidas > 0 && <Selo variante="principal">{item.naoLidas}</Selo>}
                </span>
              </button>
            ))}
          </aside>

          <section className="cartao bate-papo">
            {conversa.carregando && <Carregando />}
            {conversa.erro && <Aviso>{conversa.erro}</Aviso>}

            {conversa.dados && (
              <>
                <header className="bate-papo__cabecalho">
                  <Avatar
                    nome={conversa.dados.contraparte.nome}
                    foto={conversa.dados.contraparte.avatarUrl}
                  />
                  <div style={{ flex: 1 }}>
                    <strong>{conversa.dados.contraparte.nome}</strong>
                    <p className="texto-pequeno">
                      {conversa.dados.agendamento.titulo} · {conversa.dados.pet.nome}
                    </p>
                  </div>
                  <Selo variante={STATUS_AGENDAMENTO[conversa.dados.agendamento.status].selo}>
                    {STATUS_AGENDAMENTO[conversa.dados.agendamento.status].rotulo}
                  </Selo>
                </header>

                <div className="bate-papo__mensagens">
                  {conversa.dados.mensagens.map((mensagem) => (
                    <div
                      key={mensagem.id}
                      className={`bolha${mensagem.autorId === usuario?.id ? ' bolha--minha' : ''}`}
                    >
                      {mensagem.conteudo}
                      <time dateTime={mensagem.enviadoEm}>
                        {mensagem.autorNome.split(' ')[0]} · {formatarHora(mensagem.enviadoEm)}
                      </time>
                    </div>
                  ))}
                  <div ref={fim} />
                </div>

                {erroEnvio && <Aviso>{erroEnvio}</Aviso>}

                <form
                  className="bate-papo__formulario"
                  onSubmit={(evento) => {
                    evento.preventDefault();
                    void enviar();
                  }}
                >
                  <input
                    type="text"
                    value={texto}
                    maxLength={1000}
                    placeholder="Escreva uma mensagem…"
                    aria-label="Mensagem"
                    onChange={(evento) => setTexto(evento.target.value)}
                  />
                  <Botao tipo="submit" desabilitado={enviando || texto.trim().length === 0}>
                    <Send size={16} aria-hidden />
                    <span className="somente-leitores-de-tela">Enviar</span>
                  </Botao>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default Mensagens;
