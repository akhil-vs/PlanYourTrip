"use client";

import { useMapStore } from "@/stores/mapStore";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

export function FilterPanel() {
  const { searchRadius, setSearchRadius } = useMapStore();

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Search Radius
          </Label>
          <span className="text-sm font-medium">{searchRadius} km</span>
        </div>
        <Slider
          value={[searchRadius]}
          onValueChange={([v]) => setSearchRadius(v)}
          min={1}
          max={50}
          step={1}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1 km</span>
          <span>50 km</span>
        </div>
      </div>
    </div>
  );
}
