import type { ReactNode } from 'react';
import { Star } from 'lucide-react';
import { formatarNota, iniciais } from '../utils/formato';

/* ------------------------------------------------------------------ botão */
type VarianteBotao = 'principal' | 'contorno' | 'suave' | 'alerta' | 'texto';

interface BotaoProps {
  children: ReactNode;
  variante?: VarianteBotao;
  tipo?: 'button' | 'submit';
  pequeno?: boolean;
  largo?: boolean;
  desabilitado?: boolean;
  onClick?: () => void;
  title?: string;
}

export const Botao = ({
  children,
  variante = 'principal',
  tipo = 'button',
  pequeno = false,
  largo = false,
  desabilitado = false,
  onClick,
  title,
}: BotaoProps) => (
  <button
    type={tipo}
    className={[
      'botao',
      `botao--${variante}`,
      pequeno ? 'botao--pequeno' : '',
      largo ? 'botao--largo' : '',
    ]
      .filter(Boolean)
      .join(' ')}
    disabled={desabilitado}
    onClick={onClick}
    title={title}
  >
    {children}
  </button>
);

/* ------------------------------------------------------------------- selo */
export const Selo = ({
  children,
  variante = 'neutro',
  comPonto = false,
}: {
  children: ReactNode;
  variante?: 'principal' | 'mel' | 'terracota' | 'neutro' | 'alerta' | string;
  comPonto?: boolean;
}) => {
  const classe = variante.startsWith('selo--') ? variante : `selo--${variante}`;
  return (
    <span className={`selo ${classe}${comPonto ? ' selo--ponto' : ''}`}>{children}</span>
  );
};

/* --------------------------------------------------------------- estrelas */
export const Estrelas = ({ nota, total }: { nota: number; total?: number }) => (
  <span className="estrelas">
    <Star size={14} aria-hidden />
    {formatarNota(nota)}
    {total !== undefined && <span className="texto-suave">({total})</span>}
  </span>
);

/* ----------------------------------------------------------------- avatar */
export const Avatar = ({
  nome,
  foto,
  tamanho = 'normal',
}: {
  nome: string;
  foto?: string | null;
  tamanho?: 'pequeno' | 'normal' | 'grande';
}) => {
  const classe =
    tamanho === 'grande' ? 'avatar avatar--grande' : tamanho === 'pequeno' ? 'avatar avatar--pequeno' : 'avatar';
  return (
    <span className={classe} aria-hidden>
      {foto ? <img src={foto} alt="" loading="lazy" /> : iniciais(nome)}
    </span>
  );
};

/* ------------------------------------------------------------- indicador */
export const Indicador = ({
  valor,
  rotulo,
  icone,
}: {
  valor: string | number;
  rotulo: string;
  icone?: ReactNode;
}) => (
  <div className="cartao indicador">
    {icone && <span className="texto-suave">{icone}</span>}
    <strong>{valor}</strong>
    <span>{rotulo}</span>
  </div>
);

/* ------------------------------------------------------------ carregando */
export const Carregando = ({ texto = 'Carregando…' }: { texto?: string }) => (
  <div className="carregando" role="status">
    <span className="girador" aria-hidden />
    {texto}
  </div>
);

/* ------------------------------------------------------------------ aviso */
export const Aviso = ({
  children,
  variante = 'erro',
}: {
  children: ReactNode;
  variante?: 'erro' | 'sucesso' | 'atencao';
}) => (
  <p className={`aviso aviso--${variante}`} role={variante === 'erro' ? 'alert' : 'status'}>
    {children}
  </p>
);

/* ------------------------------------------------------------ estado vazio */
export const EstadoVazio = ({
  icone,
  titulo,
  descricao,
  acao,
}: {
  icone: ReactNode;
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}) => (
  <div className="cartao estado-vazio">
    <span className="estado-vazio__icone" aria-hidden>
      {icone}
    </span>
    <h3>{titulo}</h3>
    {descricao && <p>{descricao}</p>}
    {acao}
  </div>
);
