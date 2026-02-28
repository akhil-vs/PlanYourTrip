import { create } from "zustand";

export type MapStyle = "streets" | "satellite" | "outdoors";

export interface ActiveWaypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  index: number;
}

interface MapState {
  viewState: {
    longitude: number;
    latitude: number;
    zoom: number;
    pitch: number;
    bearing: number;
  };
  mapStyle: MapStyle;
  maxTravelMinutesPerDay: number;
  dayStartMinutes: number;
  dayEndMinutes: number;
  defaultVisitMinutes: number;
  searchRadius: number;
  sidebarOpen: boolean;
  activeWaypoint: ActiveWaypoint | null;
  routeSummaryOpen: boolean;

  setViewState: (vs: Partial<MapState["viewState"]>) => void;
  setMapStyle: (style: MapStyle) => void;
  setMaxTravelMinutesPerDay: (minutes: number) => void;
  setDayStartMinutes: (minutes: number) => void;
  setDayEndMinutes: (minutes: number) => void;
  setDefaultVisitMinutes: (minutes: number) => void;
  setSearchRadius: (radius: number) => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveWaypoint: (wp: ActiveWaypoint | null) => void;
  setRouteSummaryOpen: (open: boolean) => void;
}

const MAP_STYLES: Record<MapStyle, string> = {
  streets: "mapbox://styles/mapbox/streets-v12",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  outdoors: "mapbox://styles/mapbox/outdoors-v12",
};

export const getMapStyleUrl = (style: MapStyle) => MAP_STYLES[style];

export const useMapStore = create<MapState>((set) => ({
  viewState: {
    longitude: 0,
    latitude: 20,
    zoom: 2,
    pitch: 0,
    bearing: 0,
  },
  mapStyle: "streets",
  maxTravelMinutesPerDay: 180,
  dayStartMinutes: 9 * 60,
  dayEndMinutes: 20 * 60,
  defaultVisitMinutes: 60,
  searchRadius: 10,
  sidebarOpen: true,
  activeWaypoint: null,
  routeSummaryOpen: false,

  setViewState: (vs) =>
    set((s) => ({ viewState: { ...s.viewState, ...vs } })),
  setMapStyle: (mapStyle) => set({ mapStyle }),
  setMaxTravelMinutesPerDay: (maxTravelMinutesPerDay) =>
    set({ maxTravelMinutesPerDay }),
  setDayStartMinutes: (dayStartMinutes) => set({ dayStartMinutes }),
  setDayEndMinutes: (dayEndMinutes) => set({ dayEndMinutes }),
  setDefaultVisitMinutes: (defaultVisitMinutes) => set({ defaultVisitMinutes }),
  setSearchRadius: (searchRadius) => set({ searchRadius }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setActiveWaypoint: (activeWaypoint) =>
    set((s) => ({
      activeWaypoint,
      routeSummaryOpen: activeWaypoint ? false : s.routeSummaryOpen,
    })),
  setRouteSummaryOpen: (routeSummaryOpen) =>
    set((s) => ({
      routeSummaryOpen,
      activeWaypoint: routeSummaryOpen ? null : s.activeWaypoint,
    })),
}));
