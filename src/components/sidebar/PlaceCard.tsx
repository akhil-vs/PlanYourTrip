"use client";

import { POI } from "@/stores/tripStore";
import { useMapStore } from "@/stores/mapStore";
import { Star, MapPin, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PlaceCardProps {
  poi: POI;
  onSelect?: (poi: POI) => void;
}

export function PlaceCard({ poi, onSelect }: PlaceCardProps) {
  const setViewState = useMapStore((s) => s.setViewState);

  return (
    <button
      className="w-full text-left p-3 rounded-lg border hover:bg-gray-50 transition-colors group"
      onClick={() => {
        setViewState({ longitude: poi.lng, latitude: poi.lat, zoom: 15 });
        onSelect?.(poi);
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate group-hover:text-blue-600 transition-colors">
            {poi.name}
          </p>
          {poi.subcategory && (
            <Badge variant="secondary" className="mt-1 text-[10px] capitalize">
              {poi.subcategory.replace(/_/g, " ")}
            </Badge>
          )}
          {poi.address && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{poi.address}</span>
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          {(poi.rating ?? 0) > 0 && (
            <div className="flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-medium">{poi.rating}</span>
            </div>
          )}
          {poi.url && (
            <a
              href={poi.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-blue-500 hover:text-blue-700"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </button>
  );
}
