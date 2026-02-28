"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Loader2, LocateFixed } from "lucide-react";
import { searchLocations, resetSearchSession, SearchResult } from "@/lib/api/mapbox";
import { useTripStore } from "@/stores/tripStore";
import { useMapStore } from "@/stores/mapStore";
import { Button } from "@/components/ui/button";

export function SearchInput({ disabled = false }: { disabled?: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const insertWaypointNear = useTripStore((s) => s.insertWaypointNear);
  const { setViewState, viewState } = useMapStore();
  const debounceRef = useRef<NodeJS.Timeout>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const doSearch = useCallback(async (q: string) => {
    if (disabled) return;
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const proximity =
        viewState.longitude !== 0 || viewState.latitude !== 0
          ? { lng: viewState.longitude, lat: viewState.latitude }
          : undefined;
      const data = await searchLocations(q, proximity);
      setResults(data);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [viewState.longitude, viewState.latitude, disabled]);

  const handleChange = (value: string) => {
    if (disabled) return;
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 450);
  };

  const handleSelect = (result: SearchResult) => {
    if (disabled) return;
    insertWaypointNear({ name: result.name, lat: result.lat, lng: result.lng });
    setViewState({ longitude: result.lng, latitude: result.lat, zoom: 10 });
    setQuery("");
    setResults([]);
    setOpen(false);
    resetSearchSession();
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleUseCurrentLocation = () => {
    if (disabled) return;
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported in this browser");
      return;
    }

    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        insertWaypointNear({
          name: "Current Location",
          lat,
          lng,
        });
        setViewState({ longitude: lng, latitude: lat, zoom: 12 });
        setLocating(false);
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Location permission denied"
            : "Unable to fetch current location";
        setLocationError(message);
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  return (
    <div ref={containerRef} className="relative z-20">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search destinations worldwide..."
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (results.length > 0) {
                handleSelect(results[0]);
              } else if (query.trim().length >= 2) {
                void doSearch(query);
              }
            }
          }}
          className="pl-10 pr-10"
          disabled={disabled}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2 w-full gap-2"
        onClick={handleUseCurrentLocation}
        disabled={locating || disabled}
      >
        {locating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LocateFixed className="h-4 w-4" />
        )}
        {locating ? "Getting location..." : "Use current location"}
      </Button>
      {locationError && (
        <p className="mt-1 text-xs text-red-500">{locationError}</p>
      )}

      {open && (
        <div className="absolute z-[120] w-full mt-1 bg-white rounded-lg border shadow-lg max-h-80 overflow-y-auto">
          {results.length > 0 ? (
            results.map((r) => (
              <button
                key={r.id}
                onClick={() => handleSelect(r)}
                className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-gray-50 text-left transition-colors"
              >
                <MapPin className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {r.fullName}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <p className="px-3 py-2.5 text-xs text-muted-foreground">
              No locations found. Try another search.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
