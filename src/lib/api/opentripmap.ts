import type { POI } from "@/stores/tripStore";

export interface AttractionFilters {
  radius: number;
  kinds?: string;
}

export async function fetchAttractions(
  lat: number,
  lng: number,
  filters: AttractionFilters
): Promise<POI[]> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lng: lng.toString(),
    radius: (filters.radius * 1000).toString(),
    ...(filters.kinds && { kinds: filters.kinds }),
  });

  const res = await fetch(`/api/attractions?${params}`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchAttractionsForWaypoints(
  waypoints: { lat: number; lng: number }[],
  filters: AttractionFilters
): Promise<POI[]> {
  const results = await Promise.all(
    waypoints.map((wp) => fetchAttractions(wp.lat, wp.lng, filters))
  );

  const seen = new Set<string>();
  return results.flat().filter((poi) => {
    if (seen.has(poi.id)) return false;
    seen.add(poi.id);
    return true;
  });
}

export const ATTRACTION_CATEGORIES = [
  { value: "interesting_places", label: "All Interesting Places" },
  { value: "cultural", label: "Cultural" },
  { value: "historic", label: "Historic" },
  { value: "natural", label: "Natural" },
  { value: "architecture", label: "Architecture" },
  { value: "museums", label: "Museums" },
  { value: "religion", label: "Religious Sites" },
  { value: "sport", label: "Sport" },
  { value: "amusements", label: "Amusements" },
];
