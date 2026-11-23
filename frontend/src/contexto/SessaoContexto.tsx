import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, sessaoLocal } from '../servicos/api';
import type { Usuario } from '../tipos';

interface Sessao {
  usuario: Usuario | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<Usuario>;
  sair: () => void;
  recarregar: () => Promise<void>;
}

const SessaoContexto = createContext<Sessao | null>(null);

/**
 * Guarda o usuário autenticado e restaura a sessão quando o app abre
 * (o token fica em localStorage e é revalidado em /auth/eu).
 */
export const ProvedorSessao = ({ children }: { children: ReactNode }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    if (!sessaoLocal.ler()) {
      setUsuario(null);
      setCarregando(false);
      return;
    }
    try {
      setUsuario(await api.eu());
    } catch {
      sessaoLocal.limpar();
      setUsuario(null);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const entrar = useCallback(async (email: string, senha: string) => {
    const autenticado = await api.entrar(email, senha);
    setUsuario(autenticado);
    return autenticado;
  }, []);

  const sair = useCallback(() => {
    api.sair();
    setUsuario(null);
  }, []);

  const valor = useMemo<Sessao>(
    () => ({ usuario, carregando, entrar, sair, recarregar }),
    [usuario, carregando, entrar, sair, recarregar],
  );

  return <SessaoContexto.Provider value={valor}>{children}</SessaoContexto.Provider>;
};

export const useSessao = () => {
  const contexto = useContext(SessaoContexto);
  if (!contexto) throw new Error('useSessao precisa estar dentro de <ProvedorSessao>.');
  return contexto;
};
