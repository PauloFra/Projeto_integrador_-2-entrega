import { BadgeCheck, Clock, MapPin } from 'lucide-react';
import { Avatar, Botao, Estrelas, Selo } from './Basicos';
import { formatarDistancia, formatarDuracao, formatarReais } from '../utils/formato';
import type { Prestador } from '../tipos';

interface Props {
  prestador: Prestador;
  onEscolher?: (prestador: Prestador) => void;
}

/** Cartão de resultado da busca — ponto de decisão da jornada do tutor. */
export const CartaoProfissional = ({ prestador, onEscolher }: Props) => {
  const verificado = prestador.verificacao.status === 'verificado';

  return (
    <article className="cartao profissional">
      {prestador.disponivelAgora && (
        <Selo variante="principal" comPonto>
          Disponível agora
        </Selo>
      )}

      <div className="profissional__topo">
        <Avatar nome={prestador.nome} foto={prestador.avatarUrl} tamanho="grande" />
        <div>
          <div className="profissional__nome">
            <h3>{prestador.nome}</h3>
            {verificado && (
              <span title="Documentação verificada pela clínica parceira">
                <BadgeCheck size={16} aria-hidden style={{ color: 'var(--principal)' }} />
                <span className="somente-leitores-de-tela">Profissional verificado</span>
              </span>
            )}
          </div>
          <div className="profissional__meta">
            <Estrelas nota={prestador.avaliacaoMedia} total={prestador.avaliacoesTotal} />
            <span aria-hidden>·</span>
            <span>
              <MapPin size={13} aria-hidden /> {formatarDistancia(prestador.distanciaKm)}
            </span>
          </div>
        </div>
      </div>

      <div className="profissional__etiquetas">
        <Selo variante="neutro">{prestador.titulo}</Selo>
        {prestador.especialidade && <Selo variante="mel">{prestador.especialidade}</Selo>}
        {!verificado && <Selo variante="alerta">Verificação {prestador.verificacao.status}</Selo>}
      </div>

      {prestador.bio && <p className="texto-pequeno">{prestador.bio}</p>}

      <div className="profissional__rodape">
        <span className="preco">
          <strong>{formatarReais(prestador.precoCentavos)}</strong>
          <span>
            <Clock size={12} aria-hidden /> / {formatarDuracao(prestador.duracaoMinutos)}
          </span>
        </span>

        {onEscolher && (
          <Botao
            pequeno
            onClick={() => onEscolher(prestador)}
            desabilitado={!verificado}
            title={
              verificado
                ? `Agendar com ${prestador.nome}`
                : 'Profissional sem verificação ativa no momento'
            }
          >
            Escolher
          </Botao>
        )}
      </div>
    </article>
  );
};

export default CartaoProfissional;
