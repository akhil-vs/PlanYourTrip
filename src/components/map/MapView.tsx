"use client";

import { useCallback, useRef } from "react";
import Map, { NavigationControl, MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapStore, getMapStyleUrl } from "@/stores/mapStore";
import { RouteLayer } from "./RouteLayer";
import { WaypointMarkers } from "./WaypointMarkers";
import { POIMarkers } from "./POIMarkers";
import { MapStyleToggle } from "./MapStyleToggle";
import { WaypointExplorePanel } from "./WaypointExplorePanel";
import { RouteSummaryPanel } from "./RouteSummaryPanel";

interface MapViewProps {
  mapboxToken: string;
}

export function MapView({ mapboxToken }: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const { viewState, setViewState, mapStyle } = useMapStore();

  const handleMove = useCallback(
    (evt: { viewState: typeof viewState }) => {
      setViewState(evt.viewState);
    },
    [setViewState]
  );

  return (
    <div className="relative w-full h-full overflow-visible">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={handleMove}
        mapboxAccessToken={mapboxToken}
        mapStyle={getMapStyleUrl(mapStyle)}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
      >
        <NavigationControl position="bottom-right" />
        <RouteLayer />
        <WaypointMarkers />
        <POIMarkers type="attractions" />
        <POIMarkers type="stays" />
        <POIMarkers type="food" />
      </Map>
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 flex flex-col gap-1.5 z-[50]">
        <MapStyleToggle />
        <RouteSummaryPanel />
      </div>
      <WaypointExplorePanel />
    </div>
  );
}
