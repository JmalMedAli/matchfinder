const EARTH_RADIUS_KM = 6371;

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function estimateTravelTime(distanceKm: number): string {
  const avgSpeedKmh = 30;
  const minutes = Math.round((distanceKm / avgSpeedKmh) * 60);
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export const DISTANCE_FILTERS = [
  { label: "3 km", value: 3 },
  { label: "5 km", value: 5 },
  { label: "10 km", value: 10 },
  { label: "20 km", value: 20 },
] as const;

export const TUNISIA_CITIES = [
  "Boumhel",
  "Rades",
  "Ezzahra",
  "Hammam Lif",
  "Megrine",
  "Ben Arous",
] as const;
