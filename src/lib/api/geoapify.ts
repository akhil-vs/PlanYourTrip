import type { POI } from "@/stores/tripStore";

export interface PlacesFilters {
  radius: number;
  categories: string;
  limit?: number;
}

export async function fetchPlaces(
  lat: number,
  lng: number,
  filters: PlacesFilters
): Promise<POI[]> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lng: lng.toString(),
    radius: (filters.radius * 1000).toString(),
    categories: filters.categories,
    limit: (filters.limit || 40).toString(),
  });

  const res = await fetch(`/api/places?${params}`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchPlacesForWaypoints(
  waypoints: { lat: number; lng: number }[],
  filters: PlacesFilters
): Promise<POI[]> {
  const results = await Promise.all(
    waypoints.map((wp) => fetchPlaces(wp.lat, wp.lng, filters))
  );

  const seen = new Set<string>();
  return results.flat().filter((poi) => {
    if (seen.has(poi.id)) return false;
    seen.add(poi.id);
    return true;
  });
}

export const ACCOMMODATION_TYPES = [
  { value: "accommodation", label: "All Stays" },
  { value: "accommodation.hotel", label: "Hotels" },
  { value: "accommodation.hostel", label: "Hostels" },
  { value: "accommodation.motel", label: "Motels" },
  { value: "accommodation.apartment", label: "Apartments" },
  { value: "accommodation.guest_house", label: "Guest Houses" },
  { value: "accommodation.camp_site", label: "Campsites" },
];

export const FOOD_TYPES = [
  { value: "catering", label: "All Dining" },
  { value: "catering.restaurant", label: "Restaurants" },
  { value: "catering.cafe", label: "Cafes" },
  { value: "catering.fast_food", label: "Fast Food" },
  { value: "catering.bar", label: "Bars" },
  { value: "catering.pub", label: "Pubs" },
  { value: "catering.ice_cream", label: "Ice Cream" },
];
