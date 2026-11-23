import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CircleCheck, Info, TriangleAlert } from 'lucide-react';

type Tipo = 'sucesso' | 'erro' | 'informacao';

interface Aviso {
  texto: string;
  tipo: Tipo;
}

interface Contexto {
  avisar: (texto: string, tipo?: Tipo) => void;
}

const NotificacaoContexto = createContext<Contexto | null>(null);

const ICONES = {
  sucesso: CircleCheck,
  erro: TriangleAlert,
  informacao: Info,
};

/** Mensagens curtas de confirmação (aparecem por 4 segundos). */
export const ProvedorNotificacao = ({ children }: { children: ReactNode }) => {
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const avisar = useCallback((texto: string, tipo: Tipo = 'sucesso') => {
    setAviso({ texto, tipo });
  }, []);

  useEffect(() => {
    if (!aviso) return undefined;
    const temporizador = window.setTimeout(() => setAviso(null), 4000);
    return () => window.clearTimeout(temporizador);
  }, [aviso]);

  const valor = useMemo(() => ({ avisar }), [avisar]);
  const Icone = aviso ? ICONES[aviso.tipo] : null;

  return (
    <NotificacaoContexto.Provider value={valor}>
      {children}
      {aviso && Icone && (
        <div className="notificacao" role="status" aria-live="polite">
          <Icone size={16} aria-hidden />
          {aviso.texto}
        </div>
      )}
    </NotificacaoContexto.Provider>
  );
};

export const useNotificacao = () => {
  const contexto = useContext(NotificacaoContexto);
  if (!contexto) throw new Error('useNotificacao precisa estar dentro de <ProvedorNotificacao>.');
  return contexto;
};
