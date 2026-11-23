const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

/**
 * Distância em quilômetros entre dois pontos geográficos (fórmula de Haversine).
 * Usada para ordenar e filtrar profissionais pela proximidade do tutor.
 *
 * @param {{lat: number, lng: number}} origin
 * @param {{lat: number, lng: number}} destination
 * @returns {number|null} distância em km com 2 casas, ou null se faltar coordenada
 */
export const distanceInKm = (origin, destination) => {
  if (!origin || !destination) return null;
  const { lat: lat1, lng: lng1 } = origin;
  const { lat: lat2, lng: lng2 } = destination;
  if ([lat1, lng1, lat2, lng2].some((value) => typeof value !== 'number')) return null;

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((EARTH_RADIUS_KM * c).toFixed(2));
};

export default distanceInKm;
