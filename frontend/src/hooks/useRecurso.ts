import { useCallback, useEffect, useState } from 'react';
import { ErroApi } from '../servicos/api';

interface Estado<T> {
  dados: T | null;
  carregando: boolean;
  erro: string | null;
}

/**
 * Carrega um recurso da API e devolve estado de carregamento/erro.
 * `dependencias` funciona como no useEffect: muda, recarrega.
 */
export function useRecurso<T>(
  buscar: () => Promise<T>,
  dependencias: unknown[] = [],
  ativo = true,
) {
  const [estado, setEstado] = useState<Estado<T>>({
    dados: null,
    carregando: ativo,
    erro: null,
  });

  const executar = useCallback(async () => {
    if (!ativo) {
      setEstado({ dados: null, carregando: false, erro: null });
      return;
    }
    setEstado((anterior) => ({ ...anterior, carregando: true, erro: null }));
    try {
      const dados = await buscar();
      setEstado({ dados, carregando: false, erro: null });
    } catch (erro) {
      setEstado({
        dados: null,
        carregando: false,
        erro: erro instanceof ErroApi ? erro.message : 'Não foi possível carregar os dados.',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo, ...dependencias]);

  useEffect(() => {
    void executar();
  }, [executar]);

  return { ...estado, recarregar: executar, definir: (dados: T) => setEstado({ dados, carregando: false, erro: null }) };
}

export default useRecurso;
