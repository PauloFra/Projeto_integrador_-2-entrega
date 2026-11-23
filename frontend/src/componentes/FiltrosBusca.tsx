import { SlidersHorizontal } from 'lucide-react';
import type { Servico } from '../tipos';

export interface Filtros {
  servico: string;
  raioKm: number | '';
  notaMinima: number | '';
  precoMaximo: number | '';
  disponivelAgora: boolean;
  ordenar: 'distancia' | 'avaliacao' | 'preco';
}

export const FILTROS_INICIAIS: Filtros = {
  servico: 'passeio',
  raioKm: '',
  notaMinima: '',
  precoMaximo: '',
  disponivelAgora: false,
  ordenar: 'distancia',
};

interface Props {
  servicos: Servico[];
  filtros: Filtros;
  onAlterar: (filtros: Filtros) => void;
}

/**
 * Abas de serviço + filtros da busca.
 * Toda alteração dispara uma nova consulta na API (filtro no servidor).
 */
export const FiltrosBusca = ({ servicos, filtros, onAlterar }: Props) => {
  const alterar = (parcial: Partial<Filtros>) => onAlterar({ ...filtros, ...parcial });

  return (
    <div className="pilha">
      <div className="abas" role="tablist" aria-label="Tipo de cuidado">
        {servicos.map((servico) => (
          <button
            key={servico.slug}
            type="button"
            role="tab"
            aria-selected={filtros.servico === servico.slug}
            className="abas__item"
            onClick={() => alterar({ servico: servico.slug })}
          >
            {servico.nome}
            {servico.totalPrestadores !== undefined && (
              <span className="texto-pequeno">{servico.totalPrestadores}</span>
            )}
          </button>
        ))}
      </div>

      <div className="filtros">
        <span className="rotulo linha">
          <SlidersHorizontal size={14} aria-hidden /> Filtros
        </span>

        <div className="campo">
          <label htmlFor="filtro-raio">Distância</label>
          <select
            id="filtro-raio"
            value={filtros.raioKm}
            onChange={(evento) =>
              alterar({ raioKm: evento.target.value === '' ? '' : Number(evento.target.value) })
            }
          >
            <option value="">Qualquer distância</option>
            <option value={1}>Até 1 km</option>
            <option value={2}>Até 2 km</option>
            <option value={3}>Até 3 km</option>
            <option value={5}>Até 5 km</option>
          </select>
        </div>

        <div className="campo">
          <label htmlFor="filtro-nota">Avaliação</label>
          <select
            id="filtro-nota"
            value={filtros.notaMinima}
            onChange={(evento) =>
              alterar({ notaMinima: evento.target.value === '' ? '' : Number(evento.target.value) })
            }
          >
            <option value="">Todas as avaliações</option>
            <option value={4.8}>4,8 estrelas ou mais</option>
            <option value={4.9}>4,9 estrelas ou mais</option>
            <option value={5}>5 estrelas</option>
          </select>
        </div>

        <div className="campo">
          <label htmlFor="filtro-preco">Preço</label>
          <select
            id="filtro-preco"
            value={filtros.precoMaximo}
            onChange={(evento) =>
              alterar({ precoMaximo: evento.target.value === '' ? '' : Number(evento.target.value) })
            }
          >
            <option value="">Qualquer preço</option>
            <option value={35}>Até R$ 35</option>
            <option value={50}>Até R$ 50</option>
            <option value={100}>Até R$ 100</option>
            <option value={200}>Até R$ 200</option>
          </select>
        </div>

        <div className="campo">
          <label htmlFor="filtro-ordem">Ordenar por</label>
          <select
            id="filtro-ordem"
            value={filtros.ordenar}
            onChange={(evento) => alterar({ ordenar: evento.target.value as Filtros['ordenar'] })}
          >
            <option value="distancia">Mais perto de mim</option>
            <option value="avaliacao">Melhor avaliados</option>
            <option value="preco">Menor preço</option>
          </select>
        </div>

        <button
          type="button"
          className="interruptor"
          aria-pressed={filtros.disponivelAgora}
          onClick={() => alterar({ disponivelAgora: !filtros.disponivelAgora })}
        >
          Disponível agora
        </button>
      </div>
    </div>
  );
};

export default FiltrosBusca;
