import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  titulo: string;
  descricao?: string;
  aberto: boolean;
  onFechar: () => void;
  children: ReactNode;
  rodape?: ReactNode;
}

/** Diálogo simples com fechamento por Esc, clique no fundo e botão. */
export const Modal = ({ titulo, descricao, aberto, onFechar, children, rodape }: ModalProps) => {
  useEffect(() => {
    if (!aberto) return undefined;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onFechar();
    };
    document.addEventListener('keydown', aoTeclar);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = '';
    };
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      onClick={(evento) => {
        if (evento.target === evento.currentTarget) onFechar();
      }}
    >
      <div className="modal__caixa">
        <div className="modal__cabecalho">
          <div>
            <h2>{titulo}</h2>
            {descricao && <p className="texto-pequeno">{descricao}</p>}
          </div>
          <button type="button" className="modal__fechar" onClick={onFechar} aria-label="Fechar">
            <X size={18} aria-hidden />
          </button>
        </div>
        {children}
        {rodape && <div className="modal__rodape">{rodape}</div>}
      </div>
    </div>
  );
};

export default Modal;
