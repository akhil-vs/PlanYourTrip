import { NextRequest, NextResponse } from "next/server";

interface OptimizerWaypoint {
  id?: string;
  name: string;
  lat: number;
  lng: number;
  order?: number;
}

interface DayPlan {
  day: number;
  waypointIndexes: number[];
  estimatedTravelMinutes: number;
}

interface OptimizeConflict {
  waypointId?: string;
  message: string;
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineKm(a: OptimizerWaypoint, b: OptimizerWaypoint): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function nearestNeighborOrder(
  waypoints: OptimizerWaypoint[],
  fixedStart: boolean,
  fixedEnd: boolean
): OptimizerWaypoint[] {
  if (waypoints.length <= 2) return waypoints;

  const remaining = [...waypoints];
  const route: OptimizerWaypoint[] = [];
  const endWaypoint = fixedEnd ? remaining.pop() : null;

  if (fixedStart) {
    route.push(remaining.shift() as OptimizerWaypoint);
  } else {
    route.push(remaining.shift() as OptimizerWaypoint);
  }

  while (remaining.length > 0) {
    const current = route[route.length - 1];
    let nextIdx = 0;
    let best = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const dist = haversineKm(current, remaining[i]);
      if (dist < best) {
        best = dist;
        nextIdx = i;
      }
    }
    route.push(remaining.splice(nextIdx, 1)[0]);
  }

  if (endWaypoint) route.push(endWaypoint);
  return route;
}

function routeDistanceKm(route: OptimizerWaypoint[]): number {
  if (route.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    total += haversineKm(route[i], route[i + 1]);
  }
  return total;
}

function estimateLegMinutes(
  a: OptimizerWaypoint,
  b: OptimizerWaypoint,
  travelMode: "driving" | "walking" | "cycling"
): number {
  const speedKmPerHour =
    travelMode === "walking" ? 5 : travelMode === "cycling" ? 18 : 60;
  const hours = haversineKm(a, b) / speedKmPerHour;
  return Math.max(1, Math.round(hours * 60));
}

function twoOptRefine(
  route: OptimizerWaypoint[],
  fixedStart: boolean,
  fixedEnd: boolean
): OptimizerWaypoint[] {
  if (route.length < 4) return route;
  const start = fixedStart ? 1 : 0;
  const endExclusive = fixedEnd ? route.length - 1 : route.length;
  if (endExclusive - start < 3) return route;

  let improved = true;
  let bestRoute = [...route];
  let bestDistance = routeDistanceKm(bestRoute);

  while (improved) {
    improved = false;
    for (let i = start; i < endExclusive - 2; i++) {
      for (let k = i + 1; k < endExclusive - 1; k++) {
        const candidate = [...bestRoute];
        const reversed = candidate.slice(i, k + 1).reverse();
        candidate.splice(i, k - i + 1, ...reversed);
        const candidateDistance = routeDistanceKm(candidate);
        if (candidateDistance + 1e-9 < bestDistance) {
          bestRoute = candidate;
          bestDistance = candidateDistance;
          improved = true;
        }
      }
    }
  }

  return bestRoute;
}

function optimizeSegment(
  segmentWaypoints: OptimizerWaypoint[],
  fixedStart: boolean,
  fixedEnd: boolean
): OptimizerWaypoint[] {
  const seed = nearestNeighborOrder(segmentWaypoints, fixedStart, fixedEnd);
  return twoOptRefine(seed, fixedStart, fixedEnd);
}

function optimizeWithLocks(
  waypoints: OptimizerWaypoint[],
  fixedStart: boolean,
  fixedEnd: boolean,
  lockedWaypointIds: Set<string>
): OptimizerWaypoint[] {
  if (waypoints.length < 3) return waypoints;

  const effectiveLocked = new Set<string>(lockedWaypointIds);
  if (fixedStart && waypoints[0]?.id) effectiveLocked.add(waypoints[0].id);
  const lastWaypoint = waypoints[waypoints.length - 1];
  if (fixedEnd && lastWaypoint?.id) {
    effectiveLocked.add(lastWaypoint.id);
  }

  const lockedIndexes = waypoints
    .map((wp, idx) => ({ id: wp.id, idx }))
    .filter((entry) => entry.id && effectiveLocked.has(entry.id))
    .map((entry) => entry.idx);

  if (lockedIndexes.length === 0) {
    return optimizeSegment(waypoints, fixedStart, fixedEnd);
  }

  const result = [...waypoints];
  const bounds = [-1, ...lockedIndexes, waypoints.length];

  for (let i = 0; i < bounds.length - 1; i++) {
    const startBound = bounds[i];
    const endBound = bounds[i + 1];
    const unlockedStart = startBound + 1;
    const unlockedEnd = endBound - 1;
    if (unlockedStart > unlockedEnd) continue;

    const hasStartAnchor = startBound >= 0;
    const hasEndAnchor = endBound < waypoints.length;
    const segment: OptimizerWaypoint[] = [];
    if (hasStartAnchor) segment.push(result[startBound]);
    for (let idx = unlockedStart; idx <= unlockedEnd; idx++) {
      segment.push(result[idx]);
    }
    if (hasEndAnchor) segment.push(result[endBound]);

    const optimizedSegment = optimizeSegment(
      segment,
      hasStartAnchor,
      hasEndAnchor
    );

    const interiorStart = hasStartAnchor ? 1 : 0;
    const interiorEndExclusive = hasEndAnchor
      ? optimizedSegment.length - 1
      : optimizedSegment.length;
    const optimizedInterior = optimizedSegment.slice(
      interiorStart,
      interiorEndExclusive
    );

    for (let j = 0; j < optimizedInterior.length; j++) {
      result[unlockedStart + j] = optimizedInterior[j];
    }
  }

  return result;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const waypoints = (body?.waypoints || []) as OptimizerWaypoint[];
  const fixedStart = body?.fixedStart !== false;
  const fixedEnd = body?.fixedEnd !== false;
  const travelMode = (body?.travelMode || "driving") as
    | "driving"
    | "walking"
    | "cycling";
  const dayStartMinutes =
    typeof body?.dayStartMinutes === "number" &&
    Number.isFinite(body.dayStartMinutes) &&
    body.dayStartMinutes >= 0 &&
    body.dayStartMinutes <= 23 * 60 + 59
      ? Math.round(body.dayStartMinutes)
      : 9 * 60;
  const dayEndMinutes =
    typeof body?.dayEndMinutes === "number" &&
    Number.isFinite(body.dayEndMinutes) &&
    body.dayEndMinutes >= 0 &&
    body.dayEndMinutes <= 24 * 60
      ? Math.round(body.dayEndMinutes)
      : 20 * 60;
  const safeDayEndMinutes = Math.max(dayStartMinutes + 30, dayEndMinutes);
  const visitMinutesByWaypointId =
    body?.visitMinutesByWaypointId && typeof body.visitMinutesByWaypointId === "object"
      ? (body.visitMinutesByWaypointId as Record<string, number>)
      : {};
  const defaultVisitMinutes =
    typeof body?.defaultVisitMinutes === "number" &&
    Number.isFinite(body.defaultVisitMinutes) &&
    body.defaultVisitMinutes > 0
      ? Math.max(5, Math.round(body.defaultVisitMinutes))
      : 60;
  const timeWindowsByWaypointId =
    body?.timeWindowsByWaypointId && typeof body.timeWindowsByWaypointId === "object"
      ? (body.timeWindowsByWaypointId as Record<
          string,
          { openMinutes?: number; closeMinutes?: number }
        >)
      : {};
  const lockedWaypointIds = Array.isArray(body?.lockedWaypointIds)
    ? (body.lockedWaypointIds as string[]).filter(
        (id) => typeof id === "string" && id.length > 0
      )
    : [];

  if (!Array.isArray(waypoints) || waypoints.length < 2) {
    return NextResponse.json(
      { error: "At least 2 waypoints are required" },
      { status: 400 }
    );
  }

  const refined = optimizeWithLocks(
    waypoints,
    fixedStart,
    fixedEnd,
    new Set(lockedWaypointIds)
  );
  const optimized = refined.map((wp, i) => ({
    ...wp,
    order: i,
  }));

  const getVisitMinutes = (wp: OptimizerWaypoint) => {
    const raw = wp.id ? visitMinutesByWaypointId[wp.id] : undefined;
    if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
      return Math.max(5, Math.round(raw));
    }
    return defaultVisitMinutes;
  };

  const getWindow = (wp: OptimizerWaypoint) => {
    const raw = wp.id ? timeWindowsByWaypointId[wp.id] : undefined;
    const openMinutes =
      typeof raw?.openMinutes === "number" && Number.isFinite(raw.openMinutes)
        ? Math.max(0, Math.round(raw.openMinutes))
        : 0;
    const closeMinutes =
      typeof raw?.closeMinutes === "number" && Number.isFinite(raw.closeMinutes)
        ? Math.min(24 * 60, Math.round(raw.closeMinutes))
        : 24 * 60;
    return {
      openMinutes: Math.min(openMinutes, closeMinutes),
      closeMinutes: Math.max(closeMinutes, openMinutes),
    };
  };

  const canFitWaypointInDay = (
    waypoint: OptimizerWaypoint,
    arrivalMinutes: number,
    dayStart: number,
    dayEnd: number
  ) => {
    const visitMinutes = getVisitMinutes(waypoint);
    const { openMinutes, closeMinutes } = getWindow(waypoint);
    const windowStart = Math.max(dayStart, openMinutes);
    const windowEnd = Math.min(dayEnd, closeMinutes);
    const visitStart = Math.max(arrivalMinutes, windowStart);
    const visitEnd = visitStart + visitMinutes;
    return {
      fits: visitEnd <= windowEnd,
      visitStart,
      visitEnd,
      windowStart,
      windowEnd,
      visitMinutes,
    };
  };

  const days: DayPlan[] = [];
  const conflicts: OptimizeConflict[] = [];

  if (optimized.length > 0) {
    let currentDay = 1;
    let currentIndexes: number[] = [];
    let currentTravelMinutes = 0;
    let currentClockMinutes = dayStartMinutes;

    for (let i = 0; i < optimized.length; i++) {
      const waypoint = optimized[i];
      let prevInDayIndex =
        currentIndexes.length > 0 ? currentIndexes[currentIndexes.length - 1] : null;
      let legMinutes =
        prevInDayIndex === null
          ? 0
          : estimateLegMinutes(optimized[prevInDayIndex], waypoint, travelMode);
      let projectedTravelMinutes = currentTravelMinutes + legMinutes;
      let projectedArrival = currentClockMinutes + legMinutes;
      let fitCurrent = canFitWaypointInDay(
        waypoint,
        projectedArrival,
        dayStartMinutes,
        safeDayEndMinutes
      );
      if (currentIndexes.length > 0 && !fitCurrent.fits) {
        const dayTravelWithBoundaryLeg =
          prevInDayIndex !== null ? projectedTravelMinutes : currentTravelMinutes;
        days.push({
          day: currentDay,
          waypointIndexes: currentIndexes,
          estimatedTravelMinutes: dayTravelWithBoundaryLeg,
        });

        currentDay += 1;
        currentIndexes = [];
        currentTravelMinutes = 0;
        currentClockMinutes = dayStartMinutes;
        prevInDayIndex = null;
        legMinutes = 0;
        projectedTravelMinutes = 0;
        projectedArrival = currentClockMinutes;
        fitCurrent = canFitWaypointInDay(
          waypoint,
          projectedArrival,
          dayStartMinutes,
          safeDayEndMinutes
        );
      }

      if (!fitCurrent.fits) {
        conflicts.push({
          waypointId: waypoint.id,
          message: `${waypoint.name} cannot fit within the configured day/opening window`,
        });
      }
      currentIndexes.push(i);
      currentTravelMinutes = projectedTravelMinutes;
      currentClockMinutes = Math.max(projectedArrival, fitCurrent.visitStart);
      currentClockMinutes += fitCurrent.visitMinutes;
    }

    if (currentIndexes.length > 0) {
      days.push({
        day: currentDay,
        waypointIndexes: currentIndexes,
        estimatedTravelMinutes: currentTravelMinutes,
      });
    }
  }

  return NextResponse.json({ waypoints: optimized, days, conflicts });
}
