import { PawPrint } from 'lucide-react';
import type { Coordenada, Prestador } from '../tipos';
import { iniciais } from '../utils/formato';

interface Props {
  origem: Coordenada | null;
  prestadores: Prestador[];
  onEscolher?: (prestador: Prestador) => void;
}

/**
 * Mapa esquemático: posiciona os profissionais em torno do tutor usando a
 * diferença de latitude/longitude normalizada. Mantém a PoC leve, sem
 * dependência de biblioteca de mapas ou chave de API.
 */
export const MapaProfissionais = ({ origem, prestadores, onEscolher }: Props) => {
  const comCoordenada = prestadores.filter((prestador) => prestador.coordenada);

  if (!origem || comCoordenada.length === 0) {
    return (
      <div className="mapa">
        <span className="mapa__grade" aria-hidden />
        <p
          className="texto-pequeno"
          style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}
        >
          Sem coordenadas para exibir no mapa.
        </p>
      </div>
    );
  }

  const maiorDelta = Math.max(
    ...comCoordenada.map((prestador) =>
      Math.max(
        Math.abs(prestador.coordenada!.lat - origem.lat),
        Math.abs(prestador.coordenada!.lng - origem.lng),
      ),
    ),
    0.004,
  );

  const posicao = (coordenada: Coordenada) => ({
    left: `${50 + ((coordenada.lng - origem.lng) / (maiorDelta * 2.4)) * 100}%`,
    top: `${50 - ((coordenada.lat - origem.lat) / (maiorDelta * 2.4)) * 100}%`,
  });

  return (
    <div className="mapa" role="img" aria-label="Mapa com os profissionais próximos">
      <span className="mapa__grade" aria-hidden />

      <div className="mapa__pino mapa__pino--tutor" style={{ left: '50%', top: '50%' }}>
        <button type="button" title="Você está aqui" aria-label="Sua localização">
          <PawPrint size={16} aria-hidden />
        </button>
        <span>Você</span>
      </div>

      {comCoordenada.map((prestador) => (
        <div key={prestador.id} className="mapa__pino" style={posicao(prestador.coordenada!)}>
          <button
            type="button"
            onClick={() => onEscolher?.(prestador)}
            title={`${prestador.nome} — ${prestador.distanciaKm ?? '?'} km`}
          >
            {iniciais(prestador.nome)}
          </button>
          <span>
            {prestador.nome.split(' ')[0]} · {prestador.distanciaKm} km
          </span>
        </div>
      ))}
    </div>
  );
};

export default MapaProfissionais;
