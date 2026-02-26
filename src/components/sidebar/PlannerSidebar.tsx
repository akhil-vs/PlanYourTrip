"use client";

import { useEffect, useCallback, useState } from "react";
import { useMapStore } from "@/stores/mapStore";
import { useTripStore } from "@/stores/tripStore";
import { getDirections } from "@/lib/api/mapbox";
import { SearchInput } from "./SearchInput";
import { WaypointList } from "./WaypointList";
import { FilterPanel } from "./FilterPanel";
import { PlaceDetailPanel } from "./PlaceDetailPanel";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import {
  MapPin,
  Save,
  Loader2,
  PanelLeftClose,
  PanelLeft,
  Pencil,
  Check,
  Home,
} from "lucide-react";
import { useSession } from "next-auth/react";

interface PlannerSidebarProps {
  tripId?: string;
}

export function PlannerSidebar({ tripId }: PlannerSidebarProps) {
  const { sidebarOpen, setSidebarOpen } = useMapStore();
  const {
    waypoints,
    tripName,
    selectedPOI,
    setTripName,
    setTripId,
    setRoute,
    setLoading,
    setSelectedPOI,
    resetTrip,
  } = useTripStore();
  const { data: session } = useSession();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(tripName);

  // Fetch route whenever waypoints change
  const fetchRoute = useCallback(async () => {
    if (waypoints.length < 2) {
      setRoute(null);
      return;
    }

    const coords: [number, number][] = waypoints.map((w) => [w.lng, w.lat]);

    setLoading("route", true);
    try {
      const result = await getDirections(coords);
      if (result) {
        setRoute({
          distance: result.distance,
          duration: result.duration,
          geometry: result.geometry,
          legs: result.legs,
        });
      } else {
        setRoute(null);
      }
    } catch {
      setRoute(null);
    } finally {
      setLoading("route", false);
    }
  }, [waypoints, setRoute, setLoading]);

  useEffect(() => {
    fetchRoute();
  }, [fetchRoute]);

  // On mobile, start with sidebar closed
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    if (mq.matches) setSidebarOpen(false);
  }, [setSidebarOpen]);

  // New trip: reset store. Existing trip: load data
  useEffect(() => {
    if (!tripId) {
      resetTrip();
      setTripId(null);
      return;
    }
    setTripId(tripId);
    fetch(`/api/trips/${tripId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.name) setTripName(data.name);
        if (data.waypoints) {
          resetTrip();
          setTripId(tripId);
          setTripName(data.name);
          data.waypoints
            .sort((a: { order: number }, b: { order: number }) => a.order - b.order)
            .forEach((wp: { name: string; lat: number; lng: number }) => {
              useTripStore.getState().addWaypoint({
                name: wp.name,
                lat: wp.lat,
                lng: wp.lng,
              });
            });
        }
      })
      .catch(() => {});
  }, [tripId, setTripId, setTripName, resetTrip]);

  const handleSave = async () => {
    if (!session?.user) return;
    setSaving(true);
    setSaved(false);
    setSaveError("");
    try {
      const body = {
        name: tripName,
        waypoints: waypoints.map((w) => ({
          name: w.name,
          lat: w.lat,
          lng: w.lng,
          order: w.order,
        })),
      };

      const currentTripId = useTripStore.getState().tripId;
      const url = currentTripId ? `/api/trips/${currentTripId}` : "/api/trips";
      const method = currentTripId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setTripId(data.id);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setSaveError("Failed to save trip");
        setTimeout(() => setSaveError(""), 4000);
      }
    } catch {
      setSaveError("Failed to save trip");
      setTimeout(() => setSaveError(""), 4000);
    } finally {
      setSaving(false);
    }
  };

  if (!sidebarOpen) {
    return (
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 flex items-center gap-2">
        <Link
          href={session?.user ? "/dashboard" : "/"}
          className="p-2 sm:p-2.5 rounded-lg bg-white shadow-lg border hover:bg-gray-50 min-w-[44px] min-h-[44px] flex items-center justify-center"
          title={session?.user ? "Dashboard" : "Home"}
        >
          <Home className="h-5 w-5" />
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 sm:h-10 sm:w-10 bg-white shadow-lg border hover:bg-gray-50"
          onClick={() => setSidebarOpen(true)}
        >
          <PanelLeft className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Backdrop on mobile */}
      <div
        className="fixed inset-0 bg-black/40 z-30 lg:hidden"
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />
      <div className="w-[min(100vw,400px)] lg:w-[380px] h-full bg-white lg:border-r flex flex-col shrink-0 relative overflow-hidden lg:relative max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-40 max-lg:shadow-2xl max-lg:rounded-r-xl">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Link
              href={session?.user ? "/dashboard" : "/"}
              className="shrink-0 p-1.5 rounded-md hover:bg-gray-100 text-muted-foreground hover:text-foreground transition-colors"
              title={session?.user ? "Dashboard" : "Home"}
            >
              <Home className="h-5 w-5" />
            </Link>
            <MapPin className="h-5 w-5 text-blue-600 shrink-0" />
            {editingName ? (
              <div className="flex items-center gap-1 flex-1">
                <Input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="h-7 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setTripName(nameInput);
                      setEditingName(false);
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => {
                    setTripName(nameInput);
                    setEditingName(false);
                  }}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <button
                className="text-sm font-semibold truncate flex items-center gap-1 hover:text-blue-600"
                onClick={() => {
                  setNameInput(tripName);
                  setEditingName(true);
                }}
              >
                {tripName}
                <Pencil className="h-3 w-3 text-gray-400" />
              </button>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 touch-manipulation"
            onClick={() => setSidebarOpen(false)}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        {session?.user && (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={saving || waypoints.length === 0}
              size="sm"
              className="flex-1 gap-1.5 min-h-9 touch-manipulation"
              variant={saved ? "outline" : "default"}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving..." : saved ? "Saved!" : "Save Trip"}
            </Button>
          </div>
        )}

        {saveError && (
          <p className="text-xs text-red-500">{saveError}</p>
        )}

        <SearchInput />
      </div>

      {/* Content - scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 space-y-6">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Route
            </h3>
            <WaypointList />
            <Separator className="my-4" />
            <FilterPanel />
          </section>
        </div>
      </div>

      {/* Detail Panel overlay */}
      {selectedPOI && (
        <PlaceDetailPanel
          poi={selectedPOI}
          onClose={() => setSelectedPOI(null)}
        />
      )}
    </div>
    </>
  );
}
