"use client";

import { Layer, Source } from "react-map-gl/mapbox";
import { useTripStore } from "@/stores/tripStore";

export function RouteLayer() {
  const route = useTripStore((s) => s.route);

  if (!route?.geometry) return null;

  const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
    type: "Feature",
    properties: {},
    geometry: route.geometry,
  };

  return (
    <Source id="route" type="geojson" data={geojson}>
      <Layer
        id="route-line-bg"
        type="line"
        paint={{
          "line-color": "#1d4ed8",
          "line-width": 8,
          "line-opacity": 0.3,
        }}
        layout={{
          "line-join": "round",
          "line-cap": "round",
        }}
      />
      <Layer
        id="route-line"
        type="line"
        paint={{
          "line-color": "#3b82f6",
          "line-width": 4,
          "line-opacity": 0.9,
        }}
        layout={{
          "line-join": "round",
          "line-cap": "round",
        }}
      />
    </Source>
  );
}
