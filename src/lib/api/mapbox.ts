export interface SearchResult {
  id: string;
  name: string;
  fullName: string;
  lat: number;
  lng: number;
}

let searchSessionToken = crypto.randomUUID();

export function resetSearchSession() {
  searchSessionToken = crypto.randomUUID();
}

export async function searchLocations(
  query: string,
  proximity?: { lng: number; lat: number }
): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  const params = new URLSearchParams({
    q: query,
    limit: "8",
    language: "en",
    session_token: searchSessionToken,
    ...(proximity && {
      proximity: `${proximity.lng},${proximity.lat}`,
    }),
  });

  const res = await fetch(`/api/search?${params}`);
  if (!res.ok) return [];
  return res.json();
}

export interface DirectionsResult {
  distance: number;
  duration: number;
  geometry: GeoJSON.LineString;
  legs: { distance: number; duration: number }[];
}

export async function getDirections(
  coordinates: [number, number][]
): Promise<DirectionsResult | null> {
  if (coordinates.length < 2) return null;

  const coords = coordinates.map((c) => c.join(",")).join(";");
  const params = new URLSearchParams({
    coordinates: coords,
  });

  const res = await fetch(`/api/directions?${params}`, {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
    },
  });
  if (!res.ok) return null;
  return res.json();
}
